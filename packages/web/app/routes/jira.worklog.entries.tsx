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

// Schema for a single worklog entry
const worklogEntrySchema = z.object({
	localId: nonEmptyTrimmedString,
	id: z.string().optional(),
	issueKey: nonEmptyTrimmedString,
	summary: z.string().min(1),
	projectName: z.string().min(1),
	authorName: z.string().min(1),
	started: z.string().datetime({ message: 'started must be a valid ISO 8601 datetime string' }),
	timeSpentSeconds: z
		.number()
		.int()
		.positive({ message: 'timeSpentSeconds must be a positive integer' }),
	isNew: z.boolean().optional()
})

// Schema for worklog changes request
const worklogChangesRequestSchema = z
	.object({
		newEntries: z.array(worklogEntrySchema).default([]),
		modifiedEntries: z.array(worklogEntrySchema).default([]),
		deletedEntries: z.array(worklogEntrySchema).default([]),
		dateRange: z
			.object({
				from: isoDateSchema,
				to: isoDateSchema
			})
			.optional()
	})
	.superRefine((data, ctx) => {
		// At least one change must be present
		if (
			data.newEntries.length === 0 &&
			data.modifiedEntries.length === 0 &&
			data.deletedEntries.length === 0
		) {
			ctx.addIssue({
				code: 'custom',
				message:
					'At least one entry must be provided in newEntries, modifiedEntries, or deletedEntries',
				path: []
			})
		}

		// Validate date range if provided
		if (data.dateRange) {
			const fromDate = parseIsoDate(data.dateRange.from)
			const toDate = parseIsoDate(data.dateRange.to)
			if (fromDate > toDate) {
				ctx.addIssue({
					code: 'custom',
					message: 'dateRange.to must be greater than or equal to dateRange.from',
					path: ['dateRange', 'to']
				})
			}
		}

		// Validate that modified and deleted entries have an id
		for (let i = 0; i < data.modifiedEntries.length; i++) {
			const entry = data.modifiedEntries[i]
			if (entry && !entry.id) {
				ctx.addIssue({
					code: 'custom',
					message: 'modifiedEntries must have an id field',
					path: ['modifiedEntries', i, 'id']
				})
			}
		}

		for (let i = 0; i < data.deletedEntries.length; i++) {
			const entry = data.deletedEntries[i]
			if (entry && !entry.id) {
				ctx.addIssue({
					code: 'custom',
					message: 'deletedEntries must have an id field',
					path: ['deletedEntries', i, 'id']
				})
			}
		}

		// Validate that new entries don't have an id (or if they do, extract worklog ID from it)
		for (let i = 0; i < data.newEntries.length; i++) {
			const entry = data.newEntries[i]
			// If id exists, it should be in format "issueId-worklogId"
			if (entry?.id && !entry.id.includes('-')) {
				ctx.addIssue({
					code: 'custom',
					message: 'newEntries should not have an existing worklog id',
					path: ['newEntries', i, 'id']
				})
			}
		}

		// Limit total entries to prevent abuse
		const totalEntries =
			data.newEntries.length + data.modifiedEntries.length + data.deletedEntries.length
		if (totalEntries > 100) {
			ctx.addIssue({
				code: 'too_big',
				maximum: 100,
				type: 'array',
				origin: 'array',
				inclusive: true,
				message: `Total number of entries cannot exceed 100 (received ${totalEntries})`
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

export async function action({ request }: Route.ActionArgs) {
	const session = await sessionStorage.getSession(request.headers.get('Cookie'))
	const user = session.get('user')

	invariant(user?.atlassian?.id, 'User is not authenticated with Atlassian')

	// Parse and validate request body
	let body: unknown
	try {
		body = await request.json()
	} catch {
		throw new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	const parsed = worklogChangesRequestSchema.safeParse(body)
	if (!parsed.success) {
		throw new Response(JSON.stringify({ errors: parsed.error.format() }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	const em = orm.em.fork()
	const token = await em.findOne(Token, {
		profileId: user.atlassian.id,
		provider: 'atlassian'
	})

	invariant(token?.accessToken, 'Atlassian access token not found. Please reconnect your account.')

	const client = new AtlassianClient({
		accessToken: token.accessToken,
		refreshToken: token.refreshToken
	})

	const results = {
		created: { success: 0, failed: 0, errors: [] as Array<{ entry: unknown; error: string }> },
		updated: { success: 0, failed: 0, errors: [] as Array<{ entry: unknown; error: string }> },
		deleted: { success: 0, failed: 0, errors: [] as Array<{ entry: unknown; error: string }> }
	}

	// Collect all unique issue keys to resolve cloudIds
	const allIssueKeys = Array.from(
		new Set([
			...parsed.data.newEntries.map(e => e.issueKey),
			...parsed.data.modifiedEntries.map(e => e.issueKey),
			...parsed.data.deletedEntries.map(e => e.issueKey)
		])
	)

	// Resolve cloudIds for all issue keys
	const issuesResult = await client.fetchIssuesByKeys(allIssueKeys)
	const issueKeyToCloudId = new Map<string, string>()
	const issueKeyToIssueId = new Map<string, string>()

	// Get all resources and projects upfront to avoid repeated API calls
	const resources = await client.getAccessibleResources()
	const resourceProjectsMap = new Map<string, Map<string, string>>()

	for (const resource of resources) {
		const { projects } = await client.listJiraProjects(resource.id)
		const projectKeyMap = new Map<string, string>()
		for (const project of projects) {
			projectKeyMap.set(project.key.toUpperCase(), resource.id)
		}
		resourceProjectsMap.set(resource.id, projectKeyMap)
	}

	// Map issue keys to cloudIds
	for (const issue of issuesResult.issues) {
		if (issue.key && issue.fields.project?.key) {
			const projectKey = issue.fields.project.key.toUpperCase()
			// Find cloudId by checking which resource contains this project
			for (const [resourceId, projectKeyMap] of resourceProjectsMap.entries()) {
				if (projectKeyMap.has(projectKey)) {
					issueKeyToCloudId.set(issue.key.toUpperCase(), resourceId)
					issueKeyToIssueId.set(issue.key.toUpperCase(), issue.id)
					break
				}
			}
		}
	}

	// Helper to extract worklog ID from compound ID format "issueId-worklogId"
	function extractWorklogId(compoundId: string): string | null {
		const parts = compoundId.split('-')
		if (parts.length >= 2) {
			return parts.slice(1).join('-')
		}
		return null
	}

	// Create new worklogs
	for (const entry of parsed.data.newEntries) {
		const cloudId = issueKeyToCloudId.get(entry.issueKey.toUpperCase())
		if (!cloudId) {
			results.created.failed++
			results.created.errors.push({
				entry: { localId: entry.localId, issueKey: entry.issueKey },
				error: `Could not resolve cloudId for issue ${entry.issueKey}`
			})
			continue
		}

		try {
			const comment = entry.summary
				? {
						type: 'doc' as const,
						version: 1,
						content: [
							{
								type: 'paragraph' as const,
								content: [{ type: 'text' as const, text: entry.summary }]
							}
						]
					}
				: undefined

			await client.createIssueWorklog(cloudId, entry.issueKey, {
				started: entry.started,
				timeSpentSeconds: entry.timeSpentSeconds,
				comment,
				notifyUsers: false
			})

			results.created.success++
		} catch (error) {
			results.created.failed++
			results.created.errors.push({
				entry: { localId: entry.localId, issueKey: entry.issueKey },
				error: error instanceof Error ? error.message : 'Unknown error'
			})
		}
	}

	// Update existing worklogs
	for (const entry of parsed.data.modifiedEntries) {
		if (!entry.id) {
			results.updated.failed++
			results.updated.errors.push({
				entry: { localId: entry.localId, issueKey: entry.issueKey },
				error: 'Missing id field for modified entry'
			})
			continue
		}

		const cloudId = issueKeyToCloudId.get(entry.issueKey.toUpperCase())
		if (!cloudId) {
			results.updated.failed++
			results.updated.errors.push({
				entry: { localId: entry.localId, issueKey: entry.issueKey },
				error: `Could not resolve cloudId for issue ${entry.issueKey}`
			})
			continue
		}

		const worklogId = extractWorklogId(entry.id)
		if (!worklogId) {
			results.updated.failed++
			results.updated.errors.push({
				entry: { localId: entry.localId, issueKey: entry.issueKey },
				error: `Invalid worklog id format: ${entry.id}`
			})
			continue
		}

		try {
			const comment = entry.summary
				? {
						type: 'doc' as const,
						version: 1,
						content: [
							{
								type: 'paragraph' as const,
								content: [{ type: 'text' as const, text: entry.summary }]
							}
						]
					}
				: undefined

			await client.updateIssueWorklog(cloudId, entry.issueKey, worklogId, {
				started: entry.started,
				timeSpentSeconds: entry.timeSpentSeconds,
				comment,
				notifyUsers: false
			})

			results.updated.success++
		} catch (error) {
			results.updated.failed++
			results.updated.errors.push({
				entry: { localId: entry.localId, issueKey: entry.issueKey },
				error: error instanceof Error ? error.message : 'Unknown error'
			})
		}
	}

	// Delete worklogs
	for (const entry of parsed.data.deletedEntries) {
		if (!entry.id) {
			results.deleted.failed++
			results.deleted.errors.push({
				entry: { localId: entry.localId, issueKey: entry.issueKey },
				error: 'Missing id field for deleted entry'
			})
			continue
		}

		const cloudId = issueKeyToCloudId.get(entry.issueKey.toUpperCase())
		if (!cloudId) {
			results.deleted.failed++
			results.deleted.errors.push({
				entry: { localId: entry.localId, issueKey: entry.issueKey },
				error: `Could not resolve cloudId for issue ${entry.issueKey}`
			})
			continue
		}

		const worklogId = extractWorklogId(entry.id)
		if (!worklogId) {
			results.deleted.failed++
			results.deleted.errors.push({
				entry: { localId: entry.localId, issueKey: entry.issueKey },
				error: `Invalid worklog id format: ${entry.id}`
			})
			continue
		}

		try {
			await client.deleteIssueWorklog(cloudId, entry.issueKey, worklogId, {
				notifyUsers: false
			})

			results.deleted.success++
		} catch (error) {
			results.deleted.failed++
			results.deleted.errors.push({
				entry: { localId: entry.localId, issueKey: entry.issueKey },
				error: error instanceof Error ? error.message : 'Unknown error'
			})
		}
	}

	const totalSuccess = results.created.success + results.updated.success + results.deleted.success
	const totalFailed = results.created.failed + results.updated.failed + results.deleted.failed

	return {
		success: totalFailed === 0,
		updatedCount: totalSuccess,
		results,
		summary: {
			totalSuccess,
			totalFailed,
			totalProcessed: totalSuccess + totalFailed
		},
		message:
			totalFailed === 0
				? `Successfully processed ${totalSuccess} worklog ${totalSuccess === 1 ? 'entry' : 'entries'}`
				: `Processed ${totalSuccess} worklog ${totalSuccess === 1 ? 'entry' : 'entries'} successfully, ${totalFailed} failed`
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
