import type { Route } from './+types/jira.worklog.entries.ts'

import { z } from 'zod'

import { AtlassianClient } from '~/lib/atlassian/index.ts'
import { orm, Token } from '~/lib/mikro-orm/index.ts'
import * as sessionStorage from '~/lib/session/storage.ts'
import { invariant } from '~/lib/util/invariant.ts'

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/

const nonEmptyTrimmedString = z.string().trim().min(1)

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
		projectIds: z.array(nonEmptyTrimmedString).default([]),
		userIds: z.array(nonEmptyTrimmedString).default([]),
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

export async function loader({ request }: Route.LoaderArgs) {
	const session = await sessionStorage.getSession(request.headers.get('Cookie'))
	const user = session.get('user')

	invariant(user?.atlassian?.id, 'User is not authenticated with Atlassian')

	const em = orm.em.fork()
	const token = await em.findOne(Token, {
		profileId: user.atlassian.id,
		provider: 'atlassian'
	})

	invariant(token?.accessToken, 'Atlassian access token not found. Please reconnect your account.')

	const url = new URL(request.url)

	const parsed = querySchema.safeParse({
		projectIds: url.searchParams.getAll('project-id'),
		userIds: url.searchParams.getAll('user-id'),
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

	const client = new AtlassianClient({
		accessToken: token.accessToken,
		refreshToken: token.refreshToken
	})

	const pagination = paginationSchema.parse({
		page: parsed.data.page,
		size: parsed.data.size
	})

	const worklogs = await client.fetchWorklogEntries({
		projectIds: parsed.data.projectIds,
		userIds: parsed.data.userIds,
		dateRange: {
			from: parsed.data.dateFrom,
			to: parsed.data.dateTo
		}
	})

	const flattened = worklogs.issues.flatMap(issue =>
		issue.worklogs.map(worklog => ({
			id: `${issue.issueId}-${worklog.id}`,
			issueId: issue.issueId,
			issueKey: issue.issueKey,
			summary: issue.summary,
			project: issue.project,
			worklog
		}))
	)

	const sorted = flattened.sort((a, b) => {
		const aTime = a.worklog.started ? new Date(a.worklog.started).getTime() : 0
		const bTime = b.worklog.started ? new Date(b.worklog.started).getTime() : 0
		return bTime - aTime
	})

	const pageEntries = sorted.slice(pagination.offset, pagination.offset + pagination.size)
	const total = sorted.length

	return {
		entries: pageEntries,
		summary: worklogs.summary,
		pageInfo: {
			page: pagination.page,
			size: pagination.size,
			total,
			totalPages: total === 0 ? 0 : Math.ceil(total / pagination.size),
			hasNextPage: pagination.offset + pagination.size < total
		}
	}
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
