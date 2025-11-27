import type { Route } from './+types/worklog.users.ts'

import { z } from 'zod'

import type { WorklogAuthor } from '~/modules/worklogs/domain/worklog-author.ts'

import { ProfileConnectionType } from '~/domain/index.ts'
import { AtlassianClient, mapJiraUserToWorklogAuthor } from '~/lib/atlassian/index.ts'
import { Provider } from '~/lib/auth/strategies/common.ts'
import { orm, ProfileSessionConnection, Token, withRequestContext } from '~/lib/mikro-orm/index.ts'
import { createSessionStorage } from '~/lib/session/index.ts'

const queryParamsSchema = z.object({
	'resource-id': z.string().optional(),
	'query': z.string().optional(),
	'max-results': z.coerce.number().int().min(1).max(1000).optional(),
	'project-id': z
		.preprocess(
			val => (Array.isArray(val) ? val : val !== undefined ? [val] : undefined),
			z.array(z.string())
		)
		.optional()
})

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
		'resource-id': resourceId,
		query,
		'max-results': maxResults,
		'project-id': projectIds
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

	// If no projects are selected, return empty array
	if (!projectIds || projectIds.length === 0) {
		return Response.json({ users: [] })
	}

	// Extract project IDs and resource IDs from project-ids format
	// Project IDs come in format: "project:{projectId}:{resourceId}"
	const projectResourceMap = new Map<string, Map<string, string>>() // resourceId -> projectId -> projectKey

	for (const projectIdStr of projectIds) {
		const match = projectIdStr.match(/^project:([^:]+):(.+)$/)
		if (match?.[1] && match[2]) {
			const projectId = match[1]
			const resourceIdFromMatch = match[2]
			if (!projectResourceMap.has(resourceIdFromMatch)) {
				projectResourceMap.set(resourceIdFromMatch, new Map())
			}
			projectResourceMap.get(resourceIdFromMatch)?.set(projectId, '')
		}
	}

	// Fetch project keys for selected projects
	// We need project keys (like "LP") for the API, not project IDs
	const projectKeysByResource = new Map<string, string[]>()
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

	// Fetch users for each resource with selected projects
	let allUsers: Awaited<ReturnType<AtlassianClient['getUsersByProjects']>> = []

	try {
		const userPromises = Array.from(projectKeysByResource.entries()).map(
			async ([resourceId, projectKeys]) => {
				try {
					return await client.getUsersByProjects(resourceId, projectKeys, {
						signal: request.signal,
						maxResults
					})
				} catch {
					// Skip resources that fail
					return []
				}
			}
		)

		const userArrays = await Promise.all(userPromises)
		// Deduplicate users by accountId (users can appear in multiple resources/projects)
		const userMap = new Map<string, Awaited<ReturnType<AtlassianClient['getUsersByProjects']>>[0]>()
		for (const users of userArrays) {
			for (const user of users) {
				if (!userMap.has(user.accountId)) {
					userMap.set(user.accountId, user)
				}
			}
		}
		allUsers = Array.from(userMap.values())
	} catch (error) {
		// If request was aborted, return empty result
		if (error instanceof Error && error.name === 'AbortError') {
			return Response.json({ users: [] })
		}
		const errorMessage = error instanceof Error ? error.message : String(error)
		return Response.json({ error: `Failed to fetch users: ${errorMessage}` }, { status: 500 })
	}

	// Map Jira users to domain entities
	const worklogAuthors: WorklogAuthor[] = allUsers.map(mapJiraUserToWorklogAuthor)

	return Response.json({ users: worklogAuthors })
})
