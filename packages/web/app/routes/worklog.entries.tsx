import type { Route } from './+types/worklog.entries.ts'

import { z } from 'zod'

import { ProfileConnectionType } from '~/domain/index.ts'
import { AtlassianClient } from '~/lib/atlassian/index.ts'
import { Provider } from '~/lib/auth/strategies/common.ts'
import { orm, ProfileSessionConnection, Token, withRequestContext } from '~/lib/mikro-orm/index.ts'
import { createSessionStorage } from '~/lib/session/index.ts'

const queryParamsSchema = z.object({
	'page-size': z.coerce.number().int().min(1).max(100).default(50),
	'started-after': z.coerce.number().int().positive().optional(),
	'started-before': z.coerce.number().int().positive().optional(),
	'resource-id': z.string().optional(),
	'project-id': z
		.preprocess(
			val => (Array.isArray(val) ? val : val !== undefined ? [val] : undefined),
			z.array(z.string())
		)
		.optional(),
	'user-id': z
		.preprocess(
			val => (Array.isArray(val) ? val : val !== undefined ? [val] : undefined),
			z.array(z.string())
		)
		.optional()
})

/** biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Loader handles multiple concerns: auth, validation, API calls, filtering */
export const loader = withRequestContext(async function loader({ request }: Route.LoaderArgs) {
	const sessionStorage = createSessionStorage()
	const cookieSession = await sessionStorage.getSession(request.headers.get('Cookie'))

	if (!cookieSession || !cookieSession.id) {
		throw new Response('Unauthorized', { status: 401 })
	}

	// Check if session has worklog target profile connection
	const worklogTargetConnection = await orm.em.findOne(ProfileSessionConnection, {
		session: { id: cookieSession.id },
		connectionType: ProfileConnectionType.WorklogTarget
	})

	if (!worklogTargetConnection) {
		throw new Response('Unauthorized', { status: 401 })
	}

	// Parse and validate query params
	const url = new URL(request.url)
	const queryParams: Record<string, string | string[] | undefined> = {}

	// Collect all unique keys
	const keys = new Set<string>()
	for (const key of url.searchParams.keys()) {
		keys.add(key)
	}

	// For each key, get all values (handles multiple entries with same key)
	for (const key of keys) {
		const values = url.searchParams.getAll(key)
		if (values.length === 0) {
			queryParams[key] = undefined
		} else if (values.length === 1) {
			queryParams[key] = values[0]
		} else {
			queryParams[key] = values
		}
	}

	const parsedParams = queryParamsSchema.safeParse(queryParams)

	if (!parsedParams.success) {
		return Response.json(
			{ error: 'Invalid query parameters', issues: parsedParams.error.issues },
			{ status: 400 }
		)
	}

	const {
		'page-size': pageSize,
		'started-after': startedAfter,
		'started-before': startedBefore,
		'resource-id': resourceId,
		'project-id': projectIds,
		'user-id': userIds
	} = parsedParams.data

	// Get Atlassian connection
	const atlassianConnection = await orm.em.findOne(
		ProfileSessionConnection,
		{
			session: { id: cookieSession.id },
			profile: { provider: Provider.Atlassian }
		},
		{
			populate: ['profile']
		}
	)

	if (!atlassianConnection) {
		return Response.json({ error: 'Atlassian connection not found' }, { status: 404 })
	}

	const token = await orm.em.findOne(Token, {
		profileId: atlassianConnection.profile.id,
		provider: Provider.Atlassian
	})

	if (!token) {
		return Response.json({ error: 'Atlassian token not found' }, { status: 404 })
	}

	const client = new AtlassianClient({
		accessToken: token.accessToken,
		refreshToken: token.refreshToken
	})

	// Extract project IDs and resource IDs from project-ids format if provided
	// Project IDs come in format: "project:{projectId}:{resourceId}"
	const projectResourceMap = new Map<string, Map<string, string>>() // resourceId -> projectId -> projectKey

	if (projectIds && projectIds.length > 0) {
		for (const projectIdStr of projectIds) {
			const match = projectIdStr.match(/^project:([^:]+):(.+)$/)
			if (match?.[1] && match[2]) {
				const projectId = match[1]
				const resourceIdFromMatch = match[2]
				if (!projectResourceMap.has(resourceIdFromMatch)) {
					projectResourceMap.set(resourceIdFromMatch, new Map())
				}
				// We'll fetch the project key later
				projectResourceMap.get(resourceIdFromMatch)?.set(projectId, '')
			}
		}
	}

	// Fetch project keys for selected projects
	// We need project keys (like "LP") for JQL queries, not project IDs
	const projectKeysByResource = new Map<string, string[]>()
	if (projectResourceMap.size > 0) {
		const accessibleResources = await client.getAccessibleResources({ signal: request.signal })

		for (const resource of accessibleResources) {
			// Skip if resourceId is specified and doesn't match
			if (resourceId && resource.id !== resourceId) {
				continue
			}

			const projectIdsForResource = projectResourceMap.get(resource.id)
			if (projectIdsForResource && projectIdsForResource.size > 0) {
				try {
					// Fetch projects to get their keys
					const projects = await client.getProjects(resource.id, resource.url, {
						signal: request.signal
					})
					const projectKeys: string[] = []
					for (const project of projects) {
						if (projectIdsForResource.has(project.id)) {
							projectKeys.push(project.key)
						}
					}
					if (projectKeys.length > 0) {
						projectKeysByResource.set(resource.id, projectKeys)
					}
				} catch {
					// Skip if we can't fetch projects
				}
			}
		}
	}

	// If resource-id is provided, fetch worklogs for that resource only
	// Otherwise, fetch for all accessible resources
	let allWorklogs: Awaited<ReturnType<AtlassianClient['getWorklogsForAssignedIssues']>> = []

	if (resourceId) {
		try {
			const projectKeys = projectKeysByResource.get(resourceId) ?? []
			const worklogs = await client.getWorklogsForAssignedIssues(resourceId, {
				signal: request.signal,
				startedAfter,
				startedBefore,
				projectIds: projectKeys.length > 0 ? projectKeys : undefined
			})
			allWorklogs = worklogs
		} catch (error) {
			// If request was aborted, return empty result
			if (error instanceof Error && error.name === 'AbortError') {
				return Response.json({ worklogs: [], total: 0, pageSize, hasMore: false })
			}
			const errorMessage = error instanceof Error ? error.message : String(error)
			return Response.json({ error: `Failed to fetch worklogs: ${errorMessage}` }, { status: 500 })
		}
	} else {
		// Fetch accessible resources and get worklogs for each
		try {
			const accessibleResources = await client.getAccessibleResources({
				signal: request.signal
			})

			const worklogPromises = accessibleResources.map(async resource => {
				try {
					const projectKeys = projectKeysByResource.get(resource.id) ?? []
					return await client.getWorklogsForAssignedIssues(resource.id, {
						signal: request.signal,
						startedAfter,
						startedBefore,
						projectIds: projectKeys.length > 0 ? projectKeys : undefined
					})
				} catch {
					// Skip resources that fail
					return []
				}
			})

			const worklogArrays = await Promise.all(worklogPromises)
			allWorklogs = worklogArrays.flat()
		} catch (error) {
			// If request was aborted, return empty result
			if (error instanceof Error && error.name === 'AbortError') {
				return Response.json({ worklogs: [], total: 0, pageSize, hasMore: false })
			}
			const errorMessage = error instanceof Error ? error.message : String(error)
			return Response.json({ error: `Failed to fetch worklogs: ${errorMessage}` }, { status: 500 })
		}
	}

	// Filter by user account IDs if provided
	let filteredWorklogs = allWorklogs
	if (userIds && userIds.length > 0) {
		const userIdSet = new Set(userIds)
		filteredWorklogs = allWorklogs.filter(worklog =>
			userIdSet.has(worklog.author.accountId)
		)
	}

	// Paginate results
	const startIndex = 0 // Could add page-number param later
	const endIndex = startIndex + pageSize
	const paginatedWorklogs = filteredWorklogs.slice(startIndex, endIndex)

	return Response.json({
		worklogs: paginatedWorklogs,
		total: filteredWorklogs.length,
		pageSize,
		hasMore: endIndex < filteredWorklogs.length
	})
})
