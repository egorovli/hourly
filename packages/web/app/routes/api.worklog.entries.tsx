import type { Route } from './+types/api.worklog.entries.ts'
import type { AccessibleResource, Project } from '~/lib/atlassian/index.ts'
import type { SaveWorklogEntriesResult, WorklogEntryInput } from '~/lib/atlassian/client.ts'

import { DateTime } from 'luxon'
import { z } from 'zod'

import { ProfileConnectionType } from '~/domain/index.ts'
import { AtlassianClient } from '~/lib/atlassian/index.ts'
import { cached } from '~/lib/cached/index.ts'
import {
	orm,
	ProfileSessionConnection,
	Session,
	Token,
	withRequestContext
} from '~/lib/mikro-orm/index.ts'
import { createSessionStorage } from '~/lib/session/index.ts'

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
		body: z.object({
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
		})
	}
}

type ProjectWithResource = Project & { resourceId: AccessibleResource['id'] }

export const loader = withRequestContext(async function loader({ request }: Route.LoaderArgs) {
	const { em } = orm

	const sessionStorage = createSessionStorage()
	const cookieSession = await sessionStorage.getSession(request.headers.get('Cookie'))

	if (!cookieSession || !cookieSession.id) {
		throw new Response('Unauthorized', { status: 401 })
	}

	const session = await em.findOne(Session, {
		id: cookieSession.id
	})

	if (!session) {
		throw new Response('Unauthorized', { status: 401 })
	}

	const connection = await em.findOne(
		ProfileSessionConnection,
		{
			session: {
				id: session.id
			},
			connectionType: ProfileConnectionType.WorklogTarget
		},
		{
			populate: ['profile']
		}
	)

	if (!connection) {
		throw new Response('Unauthorized', { status: 401 })
	}

	const { profile } = connection

	const token = await em.findOne(Token, {
		profileId: profile.id,
		provider: profile.provider
	})

	if (!token) {
		throw new Response('Unauthorized', { status: 401 })
	}

	const client = new AtlassianClient({ accessToken: token.accessToken })

	const getAccessibleResources = cached(client.getAccessibleResources.bind(client))
	const getProjects = cached(client.getProjects.bind(client))

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
			client.getWorklogEntries({
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

	return worklogEntries
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
 * Action handler for saving worklog entries.
 * Accepts POST requests with JSON body containing entries to save.
 */
export const action = withRequestContext(async function action({ request }: Route.ActionArgs) {
	if (request.method !== 'POST') {
		throw new Response('Method not allowed', { status: 405 })
	}

	const { em } = orm

	const sessionStorage = createSessionStorage()
	const cookieSession = await sessionStorage.getSession(request.headers.get('Cookie'))

	if (!cookieSession || !cookieSession.id) {
		throw new Response('Unauthorized', { status: 401 })
	}

	const session = await em.findOne(Session, {
		id: cookieSession.id
	})

	if (!session) {
		throw new Response('Unauthorized', { status: 401 })
	}

	const connection = await em.findOne(
		ProfileSessionConnection,
		{
			session: {
				id: session.id
			},
			connectionType: ProfileConnectionType.WorklogTarget
		},
		{
			populate: ['profile']
		}
	)

	if (!connection) {
		throw new Response('Unauthorized', { status: 401 })
	}

	const { profile } = connection

	const token = await em.findOne(Token, {
		profileId: profile.id,
		provider: profile.provider
	})

	if (!token) {
		throw new Response('Unauthorized', { status: 401 })
	}

	// Parse and validate request body
	let body: unknown

	try {
		body = await request.json()
	} catch {
		throw new Response('Invalid JSON body', { status: 400 })
	}

	const validation = await schema.action.body.safeParseAsync(body)

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

	const client = new AtlassianClient({ accessToken: token.accessToken })

	// Get current user account ID for idempotency matching
	const getMe = cached(client.getMe.bind(client))
	const currentUser = await getMe()

	// Save worklogs for each resource
	const allResults: SaveWorklogEntriesResult['results'] = []

	for (const [resourceId, resourceEntries] of entriesByResource) {
		// console.log('saving...')
		// console.log({
		// 	accessibleResourceId: resourceId,
		// 	entries: resourceEntries,
		// 	idempotent: true,
		// 	currentUserAccountId: currentUser.account_id
		// })
		const result = await client.saveWorklogEntries({
			accessibleResourceId: resourceId,
			entries: resourceEntries,
			idempotent: true,
			currentUserAccountId: currentUser.account_id,
			signal: request.signal
		})

		allResults.push(...result.results)
	}

	const successCount = allResults.filter(r => r.success).length
	const failureCount = allResults.filter(r => !r.success).length

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
})
