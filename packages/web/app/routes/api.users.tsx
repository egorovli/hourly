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

			'page[size]': z.coerce.number().int().positive().optional().default(10),
			'page[number]': z.coerce.number().int().positive().optional().default(1),

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

	const url = new URL(request.url)

	const query = await schema.loader.query.parseAsync({
		'filter[project]': url.searchParams.getAll('filter[project]'),
		'filter[query]': url.searchParams.get('filter[query]') ?? undefined,
		'page[size]': url.searchParams.get('page[size]') ?? undefined,
		'page[number]': url.searchParams.get('page[number]') ?? undefined
	})

	const projectIds =
		query['filter[project]'].length > 0
			? query['filter[project]']
			: projects.map(project => `${project.resourceId}:${project.id}`)

	const projectKeysByResourceId = groupProjectsByResourceId({ projects, projectIds })

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

	const unique = Array.from(new Map(users.map(user => [user.accountId, user])).values())
	return unique
})

interface GroupProjectsByResourceIdParams {
	projects: Project[]
	projectIds: string[]
}

function groupProjectsByResourceId(
	params: GroupProjectsByResourceIdParams
): Record<AccessibleResource['id'], Project['key'][]> {
	const projectsById = new Map(params.projects.map(project => [project.id, project]))
	const projectKeysByResourceId: Record<AccessibleResource['id'], Project['key'][]> = {}

	for (const compoundId of params.projectIds) {
		const [resourceId, projectId] = compoundId.split(':')

		if (!resourceId || !projectId) {
			continue
		}

		const project = projectsById.get(projectId)

		if (!project) {
			continue
		}

		if (projectKeysByResourceId[resourceId] === undefined) {
			projectKeysByResourceId[resourceId] = []
		}

		projectKeysByResourceId[resourceId].push(project.key)
	}

	return projectKeysByResourceId
}
