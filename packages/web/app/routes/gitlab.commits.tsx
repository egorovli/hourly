import type { Route } from './+types/gitlab.commits.ts'

import { z } from 'zod'
import { DateTime } from 'luxon'

import { GitLabClient } from '~/lib/gitlab/client.ts'
import { orm, Token } from '~/lib/mikro-orm/index.ts'
import * as sessionStorage from '~/lib/session/storage.ts'
import { invariant } from '~/lib/util/invariant.ts'

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/
const projectIdSchema = z.coerce.number().int().positive()
const contributorIdSchema = z.string().trim().min(1)

const isoDateSchema = z
	.string()
	.trim()
	.regex(isoDatePattern, 'Date must be in YYYY-MM-DD format')
	.refine(isValidIsoDate, 'Invalid calendar date')

const paginationSchema = z
	.object({
		page: z.coerce.number().int().min(1).default(1),
		size: z.coerce.number().int().min(1).max(100).default(12)
	})
	.transform(data => ({
		page: data.page,
		size: data.size,
		offset: (data.page - 1) * data.size
	}))

const querySchema = z
	.object({
		projectIds: z.array(projectIdSchema).min(1, 'Select at least one GitLab project'),
		contributorIds: z.array(contributorIdSchema).min(1, 'Select at least one contributor'),
		dateFrom: isoDateSchema,
		dateTo: isoDateSchema
	})
	.and(paginationSchema)
	.superRefine(({ dateFrom, dateTo }, ctx) => {
		if (parseIsoDate(dateFrom) > parseIsoDate(dateTo)) {
			ctx.addIssue({
				code: 'custom',
				message: 'date-to must be greater than or equal to date-from',
				path: ['dateTo']
			})
		}
	})

const ISSUE_KEY_PATTERN = /\b[A-Z][A-Z0-9]+-\d+\b/g

export async function loader({ request }: Route.LoaderArgs) {
	const session = await sessionStorage.getSession(request.headers.get('Cookie'))
	const user = session.get('user')

	invariant(user?.gitlab?.id, 'User is not authenticated with GitLab')

	const em = orm.em.fork()
	const token = await em.findOne(Token, {
		profileId: user.gitlab.id,
		provider: 'gitlab'
	})

	invariant(token?.accessToken, 'GitLab access token not found. Please reconnect your account.')

	const url = new URL(request.url)
	const parsed = querySchema.safeParse({
		projectIds: url.searchParams.getAll('project-id'),
		contributorIds: url.searchParams.getAll('contributor-id'),
		dateFrom: url.searchParams.get('date-from') ?? undefined,
		dateTo: url.searchParams.get('date-to') ?? undefined,
		page: url.searchParams.get('page') ?? undefined,
		size: url.searchParams.get('size') ?? undefined
	})

	if (!parsed.success) {
		throw new Response(JSON.stringify({ errors: parsed.error.format() }), {
			status: 400,
			headers: {
				'Content-Type': 'application/json'
			}
		})
	}

	const pagination = paginationSchema.parse({
		page: parsed.data.page,
		size: parsed.data.size
	})

	const client = new GitLabClient({
		accessToken: token.accessToken,
		refreshToken: token.refreshToken,
		baseUrl: user.gitlab.baseUrl ?? undefined
	})

	const commits = await client.listCommitsForContributors({
		projectIds: parsed.data.projectIds,
		contributorIds: parsed.data.contributorIds,
		dateRange: {
			from: parsed.data.dateFrom,
			to: parsed.data.dateTo
		}
	})

	const sortedCommits = commits.slice().sort((a, b) => {
		const aTime = a.created_at ? DateTime.fromISO(a.created_at).toMillis() : 0
		const bTime = b.created_at ? DateTime.fromISO(b.created_at).toMillis() : 0
		return bTime - aTime
	})

	const pageCommits = sortedCommits.slice(pagination.offset, pagination.offset + pagination.size)
	const issueKeySet = new Set<string>()

	const simplifiedCommits = pageCommits.map(commit => {
		const derivedIssueKeys = extractIssueKeysFromCommit(commit)
		for (const key of derivedIssueKeys) {
			issueKeySet.add(key)
		}

		return {
			id: commit.id,
			shortId: commit.short_id ?? commit.id.slice(0, 8),
			projectId: commit.projectId,
			title: commit.title ?? '',
			message: commit.message ?? '',
			authorName: commit.author_name ?? commit.committer_name ?? 'Unknown author',
			authorEmail: commit.author_email ?? commit.committer_email,
			createdAt: commit.created_at ?? null,
			issueKeys: derivedIssueKeys
		}
	})

	const totalCommits = sortedCommits.length

	return {
		commits: simplifiedCommits,
		summary: {
			totalCommitsMatched: totalCommits,
			projectsScanned: parsed.data.projectIds.length,
			contributorsFiltered: parsed.data.contributorIds.length
		},
		issueKeys: Array.from(issueKeySet),
		pageInfo: {
			page: pagination.page,
			size: pagination.size,
			total: totalCommits,
			totalPages: totalCommits === 0 ? 0 : Math.ceil(totalCommits / pagination.size),
			hasNextPage: pagination.offset + pagination.size < totalCommits
		}
	}
}

function extractIssueKeysFromCommit(commit: { title?: string | null; message?: string | null }) {
	const text = `${commit.title ?? ''}\n${commit.message ?? ''}`
	const matches = text.match(ISSUE_KEY_PATTERN)
	if (!matches) {
		return []
	}

	return Array.from(new Set(matches.map(key => key.toUpperCase())))
}

function parseIsoDate(value: string) {
	const dt = DateTime.fromISO(`${value}T00:00:00.000Z`, { zone: 'utc' })
	return dt.isValid ? dt.toJSDate() : new Date()
}

function isValidIsoDate(value: string) {
	if (!isoDatePattern.test(value)) {
		return false
	}

	const dt = DateTime.fromISO(`${value}T00:00:00.000Z`, { zone: 'utc' })
	if (!dt.isValid) {
		return false
	}

	return dt.toISODate() === value
}
