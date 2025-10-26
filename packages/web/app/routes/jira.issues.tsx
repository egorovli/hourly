import type { Route } from './+types/jira.issues.ts'

import { z } from 'zod'

import { AtlassianClient } from '~/lib/atlassian/index.ts'
import { orm, Token } from '~/lib/mikro-orm/index.ts'
import * as sessionStorage from '~/lib/session/storage.ts'
import { invariant } from '~/lib/util/invariant.ts'

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/
const jiraIssueKeyPattern = /^[A-Z][A-Z0-9]+-\d+$/i
const nonEmptyTrimmedString = z.string().trim().min(1)

const isoDateSchema = z
	.string()
	.trim()
	.regex(isoDatePattern, 'Date must be in YYYY-MM-DD format')
	.refine(isValidIsoDate, 'Invalid calendar date')

const issueKeySchema = z
	.string()
	.trim()
	.regex(jiraIssueKeyPattern, 'Issue key must follow the pattern ABC-123')

const querySchema = z
	.object({
		projectIds: z.array(nonEmptyTrimmedString).default([]),
		userIds: z.array(nonEmptyTrimmedString).default([]),
		dateFrom: isoDateSchema.optional(),
		dateTo: isoDateSchema.optional(),
		issueKeys: z.array(issueKeySchema).default([])
	})
	.superRefine(({ dateFrom, dateTo, issueKeys, projectIds, userIds }, ctx) => {
		if (issueKeys.length > 0) {
			return
		}

		if (!dateFrom || !dateTo) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'date-from and date-to are required unless querying by issue keys',
				path: ['dateFrom']
			})
			return
		}

		if (parseIsoDate(dateFrom) > parseIsoDate(dateTo)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'date-to must be greater than or equal to date-from',
				path: ['dateTo']
			})
			return
		}

		if (projectIds.length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Select at least one project',
				path: ['projectIds']
			})
		}

		if (userIds.length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Select at least one user',
				path: ['userIds']
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
		issueKeys: url.searchParams.getAll('issue-key')
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

	if (parsed.data.issueKeys.length > 0) {
		return client.fetchIssuesByKeys(parsed.data.issueKeys)
	}

	const dateFrom = parsed.data.dateFrom
	const dateTo = parsed.data.dateTo

	invariant(dateFrom, 'date-from is required')
	invariant(dateTo, 'date-to is required')

	return client.fetchTouchedIssues({
		projectIds: parsed.data.projectIds,
		userIds: parsed.data.userIds,
		dateRange: {
			from: dateFrom,
			to: dateTo
		}
	})
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
