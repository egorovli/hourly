import type { Route } from './+types/gitlab.commits.ts'

import { z } from 'zod'

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

const querySchema = z
	.object({
		projectIds: z.array(projectIdSchema).min(1, 'Select at least one GitLab project'),
		contributorIds: z.array(contributorIdSchema).min(1, 'Select at least one contributor'),
		dateFrom: isoDateSchema,
		dateTo: isoDateSchema
	})
	.superRefine(({ dateFrom, dateTo }, ctx) => {
		if (parseIsoDate(dateFrom) > parseIsoDate(dateTo)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'date-to must be greater than or equal to date-from',
				path: ['dateTo']
			})
		}
	})

const ISSUE_KEY_PATTERN = /\b[A-Z][A-Z0-9]+-\d+\b/g
const MAX_COMMITS_IN_RESPONSE = 200
const MAX_ISSUE_KEYS = 100

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
		dateTo: url.searchParams.get('date-to') ?? undefined
	})

	if (!parsed.success) {
		throw new Response(JSON.stringify({ errors: parsed.error.format() }), {
			status: 400,
			headers: {
				'Content-Type': 'application/json'
			}
		})
	}

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
		},
		limitPerProject: MAX_COMMITS_IN_RESPONSE
	})

	const sortedCommits = commits.slice().sort((a, b) => {
		const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
		const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
		return bTime - aTime
	})

	const issueKeySet = new Set<string>()

	const simplifiedCommits = sortedCommits.slice(0, MAX_COMMITS_IN_RESPONSE).map(commit => {
		const derivedIssueKeys = extractIssueKeysFromCommit(commit)
		for (const key of derivedIssueKeys) {
			if (issueKeySet.size >= MAX_ISSUE_KEYS) {
				break
			}
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

	return {
		commits: simplifiedCommits,
		summary: {
			totalCommitsMatched: commits.length,
			projectsScanned: parsed.data.projectIds.length,
			contributorsFiltered: parsed.data.contributorIds.length
		},
		issueKeys: Array.from(issueKeySet)
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
	return new Date(`${value}T00:00:00.000Z`)
}

function isValidIsoDate(value: string) {
	if (!isoDatePattern.test(value)) {
		return false
	}

	const date = parseIsoDate(value)
	return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}
