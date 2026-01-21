import type { Route } from './+types/api.worklog.entries.ts'
import type { AccessibleResource, Project } from '~/lib/atlassian/index.ts'
import type {
	DeleteWorklogEntriesResult,
	SaveWorklogEntriesResult,
	WorklogDeleteInput,
	WorklogEntryInput
} from '~/lib/atlassian/client.ts'

import { DateTime } from 'luxon'
import { z } from 'zod'

import { auditActions, getAuditLogger, withAuditContext } from '~/lib/audit/index.ts'
import { requireAuthOrRespond } from '~/lib/auth/index.ts'
import { cached } from '~/lib/cached/index.ts'

const schema = {
	loader: {
		query: z.object({
			'filter[project]': z
				.preprocess(
					value => (Array.isArray(value) ? value : [value]),
					z
						.string()
						.trim()
						.regex(
							/^[a-f0-9-]+:\d+$/,
							'Project ID must be in format "resourceId:projectId" (e.g., "e39dfec2-fee8-4412-b043-d6b6a24c88ac:10707")'
						)
						.array()
				)
				.optional()
				.default(() => []),

			'filter[user]': z
				.preprocess(
					value => (Array.isArray(value) ? value : [value]),
					z.string().trim().min(1).array()
				)
				.optional()
				.default(() => []),

			'filter[from]': z.iso.datetime().optional(),
			'filter[to]': z.iso.datetime().optional()
		})
	},

	action: {
		save: z.object({
			entries: z
				.object({
					worklogId: z.string().optional(),
					issueIdOrKey: z.string().min(1, 'Issue ID or key is required'),
					accessibleResourceId: z.string().min(1, 'Accessible resource ID is required'),
					timeSpentSeconds: z.number().int().positive('Time spent must be greater than 0'),
					started: z.string().min(1, 'Start time is required'),
					comment: z.string().optional()
				})
				.array()
				.min(1, 'At least one entry is required')
		}),
		delete: z.object({
			entries: z
				.object({
					worklogId: z.string().min(1, 'Worklog ID is required'),
					issueIdOrKey: z.string().min(1, 'Issue ID or key is required'),
					accessibleResourceId: z.string().min(1, 'Accessible resource ID is required')
				})
				.array()
				.min(1, 'At least one entry is required')
		}),
		sync: z
			.object({
				saves: z
					.object({
						worklogId: z.string().optional(),
						issueIdOrKey: z.string().min(1, 'Issue ID or key is required'),
						accessibleResourceId: z.string().min(1, 'Accessible resource ID is required'),
						timeSpentSeconds: z.number().int().positive('Time spent must be greater than 0'),
						started: z.string().min(1, 'Start time is required'),
						comment: z.string().optional()
					})
					.array()
					.default([]),
				deletes: z
					.object({
						worklogId: z.string().min(1, 'Worklog ID is required'),
						issueIdOrKey: z.string().min(1, 'Issue ID or key is required'),
						accessibleResourceId: z.string().min(1, 'Accessible resource ID is required')
					})
					.array()
					.default([])
			})
			.refine(data => data.saves.length > 0 || data.deletes.length > 0, {
				message: 'At least one operation (save or delete) is required'
			})
	}
}

type ProjectWithResource = Project & { resourceId: AccessibleResource['id'] }

export const loader = withAuditContext(async function loader({ request }: Route.LoaderArgs) {
	const auth = await requireAuthOrRespond(request)
	const auditLogger = getAuditLogger()

	const cacheOpts = { keyPrefix: `profile:${auth.profile.id}` }
	const getAccessibleResources = cached(
		auth.client.getAccessibleResources.bind(auth.client),
		cacheOpts
	)
	const getProjects = cached(auth.client.getProjects.bind(auth.client), cacheOpts)

	const accessibleResources = await getAccessibleResources()

	const projects = await Promise.all(
		accessibleResources.map(async resource => {
			const projectsForResource = await getProjects(resource.id)

			return projectsForResource.map(project => ({
				...project,
				resourceId: resource.id
			}))
		})
	).then(results => results.flat())

	const url = new URL(request.url)

	const query = await schema.loader.query.parseAsync({
		'filter[project]': url.searchParams.getAll('filter[project]'),
		'filter[user]': url.searchParams.getAll('filter[user]'),
		'filter[from]': url.searchParams.get('filter[from]') ?? undefined,
		'filter[to]': url.searchParams.get('filter[to]') ?? undefined
	})

	const projectIds =
		query['filter[project]'].length > 0
			? query['filter[project]']
			: projects.map(project => `${project.resourceId}:${project.id}`)

	const validatedProjects = ensureProjectsAccessible({ projectIds, projects })

	if (validatedProjects.length === 0) {
		throw new Response('No accessible projects found', { status: 403 })
	}

	const userIds = query['filter[user]']
	const fromDate = query['filter[from]']
	const toDate = query['filter[to]']

	if (fromDate === undefined || toDate === undefined) {
		throw new Response('Date range is required', { status: 400 })
	}

	const fromDateTime = DateTime.fromISO(fromDate)
	const toDateTime = DateTime.fromISO(toDate)

	if (!fromDateTime.isValid || !toDateTime.isValid) {
		throw new Response('Invalid date range', { status: 400 })
	}

	const projectsByResource = new Map<AccessibleResource['id'], ProjectWithResource[]>()

	for (const project of validatedProjects) {
		const existingProjects = projectsByResource.get(project.resourceId)

		if (existingProjects === undefined) {
			projectsByResource.set(project.resourceId, [project])
			continue
		}

		existingProjects.push(project)
	}

	const worklogPages = await Promise.all(
		Array.from(projectsByResource.entries()).map(([resourceId, resourceProjects]) =>
			auth.client.getWorklogEntries({
				accessibleResourceId: resourceId,
				projectKeys: resourceProjects.map(project => project.key),
				userAccountIds: userIds.length > 0 ? userIds : undefined,
				from: fromDateTime.toUTC().toISO() ?? fromDate,
				to: toDateTime.toUTC().toISO() ?? toDate,
				signal: request.signal
			})
		)
	)

	const worklogEntries = worklogPages.flatMap(page => page.entries)

	auditLogger?.log(
		auditActions.dataRead.worklogEntries(
			{
				projectIds: query['filter[project]'],
				userIds: query['filter[user]'],
				from: fromDate,
				to: toDate
			},
			worklogEntries.length
		)
	)

	// Return with no-cache headers to prevent stale data
	return Response.json(worklogEntries, {
		headers: {
			'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
			Pragma: 'no-cache',
			Expires: '0'
		}
	})
})

interface EnsureProjectsAccessibleParams {
	projects: ProjectWithResource[]
	projectIds: string[]
}

function ensureProjectsAccessible(params: EnsureProjectsAccessibleParams): ProjectWithResource[] {
	const projectsByCompoundId = new Map(
		params.projects.map(project => [`${project.resourceId}:${project.id}`, project])
	)

	const missingProjects = params.projectIds.filter(id => !projectsByCompoundId.has(id))

	if (missingProjects.length > 0) {
		throw new Response('Invalid project selection', { status: 400 })
	}

	return params.projectIds
		.map(projectId => projectsByCompoundId.get(projectId))
		.filter((project): project is ProjectWithResource => project !== undefined)
}

/**
 * Response type for the save worklogs action.
 */
export interface SaveWorklogsActionResponse {
	success: boolean
	results: SaveWorklogEntriesResult['results']
	successCount: number
	failureCount: number
	totalCount: number
}

/**
 * Response type for the delete worklogs action.
 */
export interface DeleteWorklogsActionResponse {
	success: boolean
	results: DeleteWorklogEntriesResult['results']
	successCount: number
	failureCount: number
	totalCount: number
}

/**
 * Response type for the unified sync worklogs action.
 * Combines results from both delete and save operations.
 */
export interface SyncWorklogsActionResponse {
	success: boolean
	outcome: 'success' | 'partial' | 'failure' | 'empty'
	deletes: {
		results: DeleteWorklogEntriesResult['results']
		summary: { totalCount: number; successCount: number; failureCount: number }
	}
	saves: {
		results: SaveWorklogEntriesResult['results']
		summary: { totalCount: number; successCount: number; failureCount: number }
	}
	summary: {
		totalCount: number
		successCount: number
		failureCount: number
		message: string
	}
}

/**
 * Action handler for saving, deleting, and syncing worklog entries.
 * Accepts POST requests for saving, DELETE requests for deleting, and PATCH for unified sync.
 */
export const action = withAuditContext(async function action({ request }: Route.ActionArgs) {
	if (request.method !== 'POST' && request.method !== 'DELETE' && request.method !== 'PATCH') {
		throw new Response('Method not allowed', { status: 405 })
	}

	const auth = await requireAuthOrRespond(request)
	const auditLogger = getAuditLogger()

	// Parse and validate request body
	let body: unknown

	try {
		body = await request.json()
	} catch {
		throw new Response('Invalid JSON body', { status: 400 })
	}

	// Route to appropriate handler based on method
	if (request.method === 'DELETE') {
		return handleDelete(auth, body, request.signal, auditLogger)
	}

	if (request.method === 'PATCH') {
		return handleSync(auth, body, request.signal, auditLogger)
	}

	return handleSave(auth, body, request.signal, auditLogger)
})

/**
 * Handle POST requests - save worklog entries.
 */
async function handleSave(
	auth: Awaited<ReturnType<typeof requireAuthOrRespond>>,
	body: unknown,
	signal: AbortSignal,
	auditLogger: ReturnType<typeof getAuditLogger>
): Promise<Response> {
	const validation = await schema.action.save.safeParseAsync(body)

	if (!validation.success) {
		return Response.json(
			{
				success: false,
				error: 'Validation failed',
				issues: validation.error.issues
			},
			{ status: 400 }
		)
	}

	const { entries } = validation.data

	// Group entries by accessible resource ID
	const entriesByResource = new Map<string, WorklogEntryInput[]>()

	for (const entry of entries) {
		const { accessibleResourceId, ...worklogInput } = entry
		const existingEntries = entriesByResource.get(accessibleResourceId) ?? []
		existingEntries.push(worklogInput)
		entriesByResource.set(accessibleResourceId, existingEntries)
	}

	const cacheOpts = { keyPrefix: `profile:${auth.profile.id}` }

	// Get current user account ID for idempotency matching
	const getMe = cached(auth.client.getMe.bind(auth.client), cacheOpts)
	const currentUser = await getMe()

	// Save worklogs for each resource
	const allResults: SaveWorklogEntriesResult['results'] = []

	for (const [resourceId, resourceEntries] of entriesByResource) {
		const result = await auth.client.saveWorklogEntries({
			accessibleResourceId: resourceId,
			entries: resourceEntries,
			idempotent: true,
			currentUserAccountId: currentUser.account_id,
			signal
		})

		allResults.push(...result.results)
	}

	const successCount = allResults.filter(r => r.success).length
	const failureCount = allResults.filter(r => !r.success).length

	// Log audit event based on results
	if (failureCount === 0) {
		auditLogger?.log(
			auditActions.dataMutation.worklogSaveSuccess(
				successCount,
				entries.map(e => ({ issueKey: e.issueIdOrKey, timeSpentSeconds: e.timeSpentSeconds }))
			)
		)
	} else if (successCount > 0) {
		auditLogger?.log(
			auditActions.dataMutation.worklogSavePartial(
				successCount,
				failureCount,
				allResults
					.filter(r => !r.success)
					.map(r => ({ issueKey: r.input.issueIdOrKey, error: r.error ?? 'Unknown error' }))
			)
		)
	} else {
		auditLogger?.log(
			auditActions.dataMutation.worklogSaveFailure(
				'All entries failed',
				entries.map(e => ({ issueKey: e.issueIdOrKey, timeSpentSeconds: e.timeSpentSeconds }))
			)
		)
	}

	const response: SaveWorklogsActionResponse = {
		success: failureCount === 0,
		results: allResults,
		successCount,
		failureCount,
		totalCount: allResults.length
	}

	return Response.json(response, {
		status: failureCount === 0 ? 200 : 207 // 207 Multi-Status for partial success
	})
}

/**
 * Handle DELETE requests - delete worklog entries.
 */
async function handleDelete(
	auth: Awaited<ReturnType<typeof requireAuthOrRespond>>,
	body: unknown,
	signal: AbortSignal,
	auditLogger: ReturnType<typeof getAuditLogger>
): Promise<Response> {
	const validation = await schema.action.delete.safeParseAsync(body)

	if (!validation.success) {
		return Response.json(
			{
				success: false,
				error: 'Validation failed',
				issues: validation.error.issues
			},
			{ status: 400 }
		)
	}

	const { entries } = validation.data

	// Group entries by accessible resource ID
	const entriesByResource = new Map<string, WorklogDeleteInput[]>()

	for (const entry of entries) {
		const { accessibleResourceId, ...deleteInput } = entry
		const existingEntries = entriesByResource.get(accessibleResourceId) ?? []
		existingEntries.push(deleteInput)
		entriesByResource.set(accessibleResourceId, existingEntries)
	}

	// Delete worklogs for each resource
	const allResults: DeleteWorklogEntriesResult['results'] = []

	for (const [resourceId, resourceEntries] of entriesByResource) {
		const result = await auth.client.deleteWorklogEntries({
			accessibleResourceId: resourceId,
			entries: resourceEntries,
			signal
		})

		allResults.push(...result.results)
	}

	const successCount = allResults.filter(r => r.success).length
	const failureCount = allResults.filter(r => !r.success).length

	// Log audit event based on results
	if (failureCount === 0) {
		auditLogger?.log(
			auditActions.dataMutation.worklogDeleteSuccess(
				successCount,
				entries.map(e => ({ worklogId: e.worklogId, issueKey: e.issueIdOrKey }))
			)
		)
	} else if (successCount > 0) {
		auditLogger?.log(
			auditActions.dataMutation.worklogDeletePartial(
				successCount,
				failureCount,
				allResults
					.filter(r => !r.success)
					.map(r => ({
						worklogId: r.input.worklogId,
						issueKey: r.input.issueIdOrKey,
						error: r.error ?? 'Unknown error'
					}))
			)
		)
	} else {
		auditLogger?.log(
			auditActions.dataMutation.worklogDeleteFailure(
				'All entries failed',
				entries.map(e => ({ worklogId: e.worklogId, issueKey: e.issueIdOrKey }))
			)
		)
	}

	const response: DeleteWorklogsActionResponse = {
		success: failureCount === 0,
		results: allResults,
		successCount,
		failureCount,
		totalCount: allResults.length
	}

	return Response.json(response, {
		status: failureCount === 0 ? 200 : 207 // 207 Multi-Status for partial success
	})
}

/**
 * Handle PATCH requests - unified sync (delete + save) with shared correlation ID.
 * Processes deletes first, then saves, and returns a combined response.
 */
async function handleSync(
	auth: Awaited<ReturnType<typeof requireAuthOrRespond>>,
	body: unknown,
	signal: AbortSignal,
	auditLogger: ReturnType<typeof getAuditLogger>
): Promise<Response> {
	const validation = await schema.action.sync.safeParseAsync(body)

	if (!validation.success) {
		return Response.json(
			{
				success: false,
				error: 'Validation failed',
				issues: validation.error.issues
			},
			{ status: 400 }
		)
	}

	const { saves, deletes } = validation.data

	// Log sync started
	auditLogger?.log(auditActions.dataMutation.worklogSyncStarted(saves.length, deletes.length))

	// Initialize result tracking
	const deleteResults: DeleteWorklogEntriesResult['results'] = []
	const saveResults: SaveWorklogEntriesResult['results'] = []

	// Process deletes first
	if (deletes.length > 0) {
		const entriesByResource = new Map<string, WorklogDeleteInput[]>()

		for (const entry of deletes) {
			const { accessibleResourceId, ...deleteInput } = entry
			const existingEntries = entriesByResource.get(accessibleResourceId) ?? []
			existingEntries.push(deleteInput)
			entriesByResource.set(accessibleResourceId, existingEntries)
		}

		for (const [resourceId, resourceEntries] of entriesByResource) {
			const result = await auth.client.deleteWorklogEntries({
				accessibleResourceId: resourceId,
				entries: resourceEntries,
				signal
			})
			deleteResults.push(...result.results)
		}

		// Log delete results
		const deleteSuccessCount = deleteResults.filter(r => r.success).length
		const deleteFailureCount = deleteResults.filter(r => !r.success).length

		if (deleteFailureCount === 0 && deleteSuccessCount > 0) {
			auditLogger?.log(
				auditActions.dataMutation.worklogDeleteSuccess(
					deleteSuccessCount,
					deletes.map(e => ({ worklogId: e.worklogId, issueKey: e.issueIdOrKey }))
				)
			)
		} else if (deleteSuccessCount > 0) {
			auditLogger?.log(
				auditActions.dataMutation.worklogDeletePartial(
					deleteSuccessCount,
					deleteFailureCount,
					deleteResults
						.filter(r => !r.success)
						.map(r => ({
							worklogId: r.input.worklogId,
							issueKey: r.input.issueIdOrKey,
							error: r.error ?? 'Unknown error'
						}))
				)
			)
		} else if (deleteFailureCount > 0) {
			auditLogger?.log(
				auditActions.dataMutation.worklogDeleteFailure(
					'All entries failed',
					deletes.map(e => ({ worklogId: e.worklogId, issueKey: e.issueIdOrKey }))
				)
			)
		}
	}

	// Process saves
	if (saves.length > 0) {
		const entriesByResource = new Map<string, WorklogEntryInput[]>()

		for (const entry of saves) {
			const { accessibleResourceId, ...worklogInput } = entry
			const existingEntries = entriesByResource.get(accessibleResourceId) ?? []
			existingEntries.push(worklogInput)
			entriesByResource.set(accessibleResourceId, existingEntries)
		}

		const cacheOpts = { keyPrefix: `profile:${auth.profile.id}` }
		const getMe = cached(auth.client.getMe.bind(auth.client), cacheOpts)
		const currentUser = await getMe()

		for (const [resourceId, resourceEntries] of entriesByResource) {
			const result = await auth.client.saveWorklogEntries({
				accessibleResourceId: resourceId,
				entries: resourceEntries,
				idempotent: true,
				currentUserAccountId: currentUser.account_id,
				signal
			})
			saveResults.push(...result.results)
		}

		// Log save results
		const saveSuccessCount = saveResults.filter(r => r.success).length
		const saveFailureCount = saveResults.filter(r => !r.success).length

		if (saveFailureCount === 0 && saveSuccessCount > 0) {
			auditLogger?.log(
				auditActions.dataMutation.worklogSaveSuccess(
					saveSuccessCount,
					saves.map(e => ({ issueKey: e.issueIdOrKey, timeSpentSeconds: e.timeSpentSeconds }))
				)
			)
		} else if (saveSuccessCount > 0) {
			auditLogger?.log(
				auditActions.dataMutation.worklogSavePartial(
					saveSuccessCount,
					saveFailureCount,
					saveResults
						.filter(r => !r.success)
						.map(r => ({ issueKey: r.input.issueIdOrKey, error: r.error ?? 'Unknown error' }))
				)
			)
		} else if (saveFailureCount > 0) {
			auditLogger?.log(
				auditActions.dataMutation.worklogSaveFailure(
					'All entries failed',
					saves.map(e => ({ issueKey: e.issueIdOrKey, timeSpentSeconds: e.timeSpentSeconds }))
				)
			)
		}
	}

	// Calculate totals
	const deleteSummary = {
		totalCount: deleteResults.length,
		successCount: deleteResults.filter(r => r.success).length,
		failureCount: deleteResults.filter(r => !r.success).length
	}

	const saveSummary = {
		totalCount: saveResults.length,
		successCount: saveResults.filter(r => r.success).length,
		failureCount: saveResults.filter(r => !r.success).length
	}

	const totalCount = deleteSummary.totalCount + saveSummary.totalCount
	const successCount = deleteSummary.successCount + saveSummary.successCount
	const failureCount = deleteSummary.failureCount + saveSummary.failureCount

	// Determine outcome
	let outcome: SyncWorklogsActionResponse['outcome']
	let message: string

	if (totalCount === 0) {
		outcome = 'empty'
		message = 'No operations to process'
	} else if (failureCount === 0) {
		outcome = 'success'
		const parts: string[] = []
		if (deleteSummary.successCount > 0) {
			parts.push(`${deleteSummary.successCount} deleted`)
		}
		if (saveSummary.successCount > 0) {
			parts.push(`${saveSummary.successCount} saved`)
		}
		message = `Sync completed: ${parts.join(', ')}`
	} else if (successCount === 0) {
		outcome = 'failure'
		message = `Sync failed: all ${failureCount} operations failed`
	} else {
		outcome = 'partial'
		message = `Partial sync: ${successCount} succeeded, ${failureCount} failed`
	}

	// Log sync completed
	auditLogger?.log(
		auditActions.dataMutation.worklogSyncCompleted(outcome, {
			deletesSucceeded: deleteSummary.successCount,
			deletesFailed: deleteSummary.failureCount,
			savesSucceeded: saveSummary.successCount,
			savesFailed: saveSummary.failureCount
		})
	)

	const response: SyncWorklogsActionResponse = {
		success: failureCount === 0,
		outcome,
		deletes: {
			results: deleteResults,
			summary: deleteSummary
		},
		saves: {
			results: saveResults,
			summary: saveSummary
		},
		summary: {
			totalCount,
			successCount,
			failureCount,
			message
		}
	}

	// Return appropriate status code
	let status: number
	if (outcome === 'success' || outcome === 'empty') {
		status = 200
	} else if (outcome === 'partial') {
		status = 207 // Multi-Status
	} else {
		status = 500
	}

	return Response.json(response, { status })
}
