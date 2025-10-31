import type { Route } from './+types/jira.worklog.entries.ts'

import { z } from 'zod'
import { DateTime } from 'luxon'

import { AtlassianClient, AtlassianClientError } from '~/lib/atlassian/index.ts'
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

// Schema for a single worklog entry (what should exist in Jira)
const worklogEntrySchema = z.object({
	localId: nonEmptyTrimmedString,
	issueKey: nonEmptyTrimmedString,
	summary: z.string().min(1),
	projectName: z.string().min(1),
	authorName: z.string().min(1),
	started: z.string().datetime({ message: 'started must be a valid ISO 8601 datetime string' }),
	timeSpentSeconds: z
		.number()
		.int()
		.positive({ message: 'timeSpentSeconds must be a positive integer' })
})

// Schema for idempotent worklog sync request
const worklogSyncRequestSchema = z
	.object({
		entries: z.array(worklogEntrySchema).default([]),
		dateRange: z.object({
			from: isoDateSchema,
			to: isoDateSchema
		})
	})
	.superRefine((data, ctx) => {
		// Validate date range
		const fromDate = parseIsoDate(data.dateRange.from)
		const toDate = parseIsoDate(data.dateRange.to)
		if (fromDate > toDate) {
			ctx.addIssue({
				code: 'custom',
				message: 'dateRange.to must be greater than or equal to dateRange.from',
				path: ['dateRange', 'to']
			})
		}

		// Limit total entries to prevent abuse
		if (data.entries.length > 100) {
			ctx.addIssue({
				code: 'too_big',
				maximum: 100,
				type: 'array',
				origin: 'array',
				inclusive: true,
				message: `Total number of entries cannot exceed 100 (received ${data.entries.length})`
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
		const aTime = a.worklog.started ? DateTime.fromISO(a.worklog.started).toMillis() : 0
		const bTime = b.worklog.started ? DateTime.fromISO(b.worklog.started).toMillis() : 0
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

	const parsed = worklogSyncRequestSchema.safeParse(body)
	if (!parsed.success) {
		console.log(
			'[worklog-entries] Validation failed:',
			JSON.stringify(parsed.error.format(), null, 2)
		)
		throw new Response(JSON.stringify({ errors: parsed.error.format() }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	console.log('[worklog-entries] Parsed request:', {
		entries: parsed.data.entries.length,
		dateRange: parsed.data.dateRange
	})

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
		deleted: { success: 0, failed: 0, errors: [] as Array<{ entry: unknown; error: string }> },
		created: { success: 0, failed: 0, errors: [] as Array<{ entry: unknown; error: string }> }
	}

	// Step 1: Fetch all existing worklogs for the user in the date range
	console.log('[worklog-entries] Fetching existing worklogs for date range:', parsed.data.dateRange)

	// Get all resources to find projects
	const resources = await client.getAccessibleResources()
	console.log(
		'[worklog-entries] Found resources:',
		resources.map(r => ({ id: r.id, name: r.name }))
	)

	// Get all projects across all resources
	const allProjects: Array<{ id: string; key: string; cloudId: string }> = []
	for (const resource of resources) {
		const { projects } = await client.listJiraProjects(resource.id)
		for (const project of projects) {
			allProjects.push({ id: project.id, key: project.key, cloudId: resource.id })
		}
	}

	console.log(`[worklog-entries] Found ${allProjects.length} total projects across all resources`)

	// Fetch existing worklogs for the user in the date range
	const existingWorklogs = await client.fetchWorklogEntries({
		projectIds: allProjects.map(p => p.id),
		userIds: [user.atlassian.id],
		dateRange: parsed.data.dateRange
	})

	console.log('[worklog-entries] Found existing worklogs:', {
		totalIssues: existingWorklogs.issues.length,
		totalWorklogs: existingWorklogs.summary.totalWorklogs
	})

	// Step 2: Delete all existing worklogs
	console.log('[worklog-entries] Starting deletion of existing worklogs...')

	const issueKeyToCloudId = new Map<string, string>()
	const issueKeyToIssueId = new Map<string, string>()

	// Build mappings for all issues that have worklogs
	for (const issueBundle of existingWorklogs.issues) {
		issueKeyToCloudId.set(issueBundle.issueKey.toUpperCase(), issueBundle.project.cloudId)
		issueKeyToIssueId.set(issueBundle.issueKey.toUpperCase(), issueBundle.issueId)
	}

	// Delete all existing worklogs
	for (const issueBundle of existingWorklogs.issues) {
		const cloudId = issueBundle.project.cloudId
		const issueId = issueBundle.issueId

		for (const worklog of issueBundle.worklogs) {
			// Only delete worklogs authored by the current user
			if (worklog.author?.accountId !== user.atlassian.id) {
				console.log(
					`[worklog-entries] Skipping worklog ${worklog.id} - not authored by current user`
				)
				continue
			}

			try {
				console.log(
					`[worklog-entries] Deleting worklog ${worklog.id} from issue ${issueBundle.issueKey}`
				)

				await client.deleteIssueWorklog(cloudId, issueId, worklog.id, {
					notifyUsers: false
				})

				results.deleted.success++
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error'
				const errorDetails = error instanceof AtlassianClientError ? error.details : undefined

				console.error(`[worklog-entries] Failed to delete worklog ${worklog.id}:`, {
					error: errorMessage,
					details: errorDetails
				})

				results.deleted.failed++
				results.deleted.errors.push({
					entry: { issueKey: issueBundle.issueKey, worklogId: worklog.id },
					error: errorMessage
				})
			}
		}
	}

	console.log('[worklog-entries] Deletion complete:', {
		success: results.deleted.success,
		failed: results.deleted.failed
	})

	// Step 3: Collect all unique issue keys from new entries and resolve cloudIds
	const allIssueKeys = Array.from(new Set(parsed.data.entries.map(e => e.issueKey)))
	console.log('[worklog-entries] Resolving cloudIds for issue keys:', allIssueKeys)

	const issuesResult = await client.fetchIssuesByKeys(allIssueKeys)
	console.log('[worklog-entries] Fetched issues:', {
		total: issuesResult.issues.length,
		issues: issuesResult.issues.map(i => ({ key: i.key, id: i.id }))
	})

	// Build resource projects map for cloudId resolution
	const resourceProjectsMap = new Map<string, Map<string, string>>()
	for (const resource of resources) {
		const { projects } = await client.listJiraProjects(resource.id)
		const projectKeyMap = new Map<string, string>()
		for (const project of projects) {
			projectKeyMap.set(project.key.toUpperCase(), resource.id)
		}
		resourceProjectsMap.set(resource.id, projectKeyMap)
	}

	// Map issue keys to cloudIds and issueIds
	for (const issue of issuesResult.issues) {
		if (issue.key && issue.fields.project?.key) {
			const projectKey = issue.fields.project.key.toUpperCase()
			for (const [resourceId, projectKeyMap] of resourceProjectsMap.entries()) {
				if (projectKeyMap.has(projectKey)) {
					issueKeyToCloudId.set(issue.key.toUpperCase(), resourceId)
					issueKeyToIssueId.set(issue.key.toUpperCase(), issue.id)
					console.log(
						`[worklog-entries] Mapped ${issue.key} -> cloudId: ${resourceId}, issueId: ${issue.id}`
					)
					break
				}
			}
		}
	}

	console.log('[worklog-entries] Final mappings:', {
		cloudIds: Array.from(issueKeyToCloudId.entries()),
		issueIds: Array.from(issueKeyToIssueId.entries())
	})

	// Step 4: Create all new worklogs
	console.log('[worklog-entries] Starting creation of new worklogs...')

	for (const entry of parsed.data.entries) {
		const cloudId = issueKeyToCloudId.get(entry.issueKey.toUpperCase())
		const issueId = issueKeyToIssueId.get(entry.issueKey.toUpperCase())

		console.log(`[worklog-entries] Creating worklog for ${entry.issueKey}:`, {
			cloudId,
			issueId,
			started: entry.started,
			timeSpentSeconds: entry.timeSpentSeconds,
			summary: entry.summary
		})

		if (!cloudId) {
			const error = `Could not resolve cloudId for issue ${entry.issueKey}`
			console.error(`[worklog-entries] ERROR: ${error}`)
			results.created.failed++
			results.created.errors.push({
				entry: { localId: entry.localId, issueKey: entry.issueKey },
				error
			})
			continue
		}

		if (!issueId) {
			const error = `Could not resolve issueId for issue ${entry.issueKey}`
			console.error(`[worklog-entries] ERROR: ${error}`)
			results.created.failed++
			results.created.errors.push({
				entry: { localId: entry.localId, issueKey: entry.issueKey },
				error
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

			// Convert ISO datetime to Jira format
			const jiraStarted = convertToJiraDateTime(entry.started)
			console.log(`[worklog-entries] Converted datetime: ${entry.started} -> ${jiraStarted}`)

			const params = {
				started: jiraStarted,
				timeSpentSeconds: entry.timeSpentSeconds,
				comment,
				notifyUsers: false
			}

			console.log(
				'[worklog-entries] Calling createIssueWorklog with params:',
				JSON.stringify(params, null, 2)
			)

			// Use issueId instead of issueKey for better reliability
			const result = await client.createIssueWorklog(cloudId, issueId, params)

			console.log('[worklog-entries] Successfully created worklog:', {
				worklogId: result.id,
				issueId: result.issueId
			})

			results.created.success++
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			const errorDetails = error instanceof AtlassianClientError ? error.details : undefined

			console.error(`[worklog-entries] Failed to create worklog for ${entry.issueKey}:`, {
				error: errorMessage,
				details: errorDetails,
				entry
			})

			results.created.failed++
			results.created.errors.push({
				entry: { localId: entry.localId, issueKey: entry.issueKey },
				error: errorMessage
			})
		}
	}

	const totalSuccess = results.deleted.success + results.created.success
	const totalFailed = results.deleted.failed + results.created.failed

	console.log('[worklog-entries] Final results:', {
		deleted: { success: results.deleted.success, failed: results.deleted.failed },
		created: { success: results.created.success, failed: results.created.failed },
		totalSuccess,
		totalFailed
	})

	if (results.deleted.errors.length > 0) {
		console.error('[worklog-entries] Deletion errors:', results.deleted.errors)
	}
	if (results.created.errors.length > 0) {
		console.error('[worklog-entries] Creation errors:', results.created.errors)
	}

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
				? `Successfully synced ${totalSuccess} worklog ${totalSuccess === 1 ? 'entry' : 'entries'}`
				: `Synced ${totalSuccess} worklog ${totalSuccess === 1 ? 'entry' : 'entries'} successfully, ${totalFailed} failed`
	}
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

/**
 * Converts ISO 8601 datetime string to Jira's datetime format
 * Jira expects: yyyy-MM-dd'T'HH:mm:ss.SSSZ where Z is a timezone offset like +0000
 * We receive: ISO 8601 format like 2025-10-01T08:15:00.000Z
 *
 * Note: If the input ends with 'Z', it's UTC and we format as +0000
 * Otherwise, we extract the timezone offset from the ISO string
 */
function convertToJiraDateTime(isoString: string): string {
	// If it ends with Z, it's UTC - convert to +0000 format
	if (isoString.endsWith('Z')) {
		// Remove the Z and add +0000
		return `${isoString.slice(0, -1)}+0000`
	}

	// If it already has a timezone offset like +0500 or -0500, check if it's in the right format
	// Jira format: yyyy-MM-dd'T'HH:mm:ss.SSS+0000
	// ISO format: yyyy-MM-dd'T'HH:mm:ss.SSS+00:00 or yyyy-MM-dd'T'HH:mm:ss.SSS+0000
	const timezoneOffsetMatch = isoString.match(/([+-])(\d{2}):?(\d{2})$/)
	if (timezoneOffsetMatch) {
		const [, sign, hours, minutes] = timezoneOffsetMatch
		// Remove the existing timezone and add in Jira format (+0000 instead of +00:00)
		const withoutTimezone = isoString.replace(/[+-]\d{2}:?\d{2}$/, '')
		return `${withoutTimezone}${sign}${hours}${minutes}`
	}

	// Fallback: parse the date and use local timezone
	const dt = DateTime.fromISO(isoString)
	if (!dt.isValid) {
		// If parsing fails, return UTC with +0000
		return `${isoString.slice(0, -1)}+0000`
	}

	const offsetMinutes = dt.offset
	const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60)
	const offsetMins = Math.abs(offsetMinutes) % 60
	const offsetSign = offsetMinutes >= 0 ? '+' : '-'
	const offsetStr = `${offsetSign}${offsetHours.toString().padStart(2, '0')}${offsetMins.toString().padStart(2, '0')}`

	// Format: yyyy-MM-dd'T'HH:mm:ss.SSSZ
	return dt.toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS") + offsetStr
}
