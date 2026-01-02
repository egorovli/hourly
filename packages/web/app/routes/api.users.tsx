import type { Route } from './+types/api.users.ts'
import type { AccessibleResource, Project } from '~/lib/atlassian/index.ts'

import { z } from 'zod'

import {
	orm,
	ProfileSessionConnection,
	Session,
	Token,
	withRequestContext
} from '~/lib/mikro-orm/index.ts'

import { createSessionStorage } from '~/lib/session/index.ts'
import { cached } from '~/lib/cached/index.ts'
import { AtlassianClient } from '~/lib/atlassian/index.ts'

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

			'filter[query]': z.string().trim().optional(),

			'page[size]': z.number().int().positive().optional().default(20),
			'page[number]': z.number().int().positive().optional().default(1),

			'sort[key]': z.string().trim().optional().default('name'),
			'sort[direction]': z.enum(['asc', 'desc']).optional().default('asc')
		})
	}
}

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
			}
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
	const getUsersForProjectsPaginated = cached(client.getUsersForProjectsPaginated.bind(client))

	const accessibleResources = await getAccessibleResources()

	const projects = await Promise.all(
		accessibleResources.map(async resource => {
			const projects = await getProjects(resource.id)

			return projects.map(project => ({
				...project,
				resourceId: resource.id
			}))
		})
	).then(results => results.flat())

	// Create lookup map: projectId -> project
	const projectsById = new Map(projects.map(project => [project.id, project]))
	console.log('projectsById', projectsById)

	const url = new URL(request.url)

	const query = await schema.loader.query.parseAsync({
		'filter[project]': url.searchParams.getAll('filter[project]')
	})

	let projectIds = query['filter[project]']

	if (projectIds.length === 0) {
		projectIds = projects.map(project => `${project.resourceId}:${project.id}`)
	}

	console.log('projectIds', projectIds)

	// Group projects by resource ID for efficient API calls
	const projectKeysByResourceId = projectIds.reduce<
		Record<AccessibleResource['id'], Project['key'][]>
	>((acc, compoundId) => {
		const [resourceId, projectId] = compoundId.split(':')

		if (!resourceId || !projectId) {
			return acc
		}

		const resource = accessibleResources.find(resource => resource.id === resourceId)
		const project = projectsById.get(projectId)

		if (!resource || !project) {
			return acc
		}

		return {
			...acc,
			[resource.id]: [...(acc[resource.id] ?? []), project.key]
		}
	}, {})

	console.log('projectKeysByResourceId', projectKeysByResourceId)

	// for (const projectId of projectIdsToUse) {
	// 	if (projectId === null) {
	// 		continue
	// 	}

	// 	const separatorIndex = projectId.indexOf(':')
	// 	if (separatorIndex === -1) {
	// 		continue
	// 	}

	// 	const resourceId = projectId.slice(0, separatorIndex)
	// 	const numericId = projectId.slice(separatorIndex + 1)
	// 	const project = projectById.get(numericId)

	// 	if (project === undefined) {
	// 		continue
	// 	}

	// 	const keys = projectsByResource[resourceId]
	// 	if (keys === undefined) {
	// 		projectsByResource[resourceId] = [project.key]
	// 	} else {
	// 		keys.push(project.key)
	// 	}
	// }

	// Fetch users for each resource's projects
	const users = await Promise.all(
		Object.entries(projectKeysByResourceId).map(async ([resourceId, projectKeys]) =>
			getUsersForProjectsPaginated({
				accessibleResourceId: resourceId,
				projectKeys,
				username: query['filter[query]'],

				// TODO: Handle pagination given that we're using multiple
				// accessible resources. It works while we're using a single
				// one for now, but we need to handle it properly.
				startAt: (query['page[number]'] - 1) * query['page[size]'],
				maxResults: query['page[size]']

				// TODO: Handle sorting.
				// sort: query['sort[key]'],
				// direction: query['sort[direction]']
			})
		)
	).then(results => results.flat())

	console.log('users', users)

	// Deduplicate users by accountId (user might be in multiple projects)
	const uniqueUsers = Array.from(new Map(users.map(user => [user.accountId, user])).values())
	console.log('uniqueUsers', uniqueUsers)

	return uniqueUsers
})
