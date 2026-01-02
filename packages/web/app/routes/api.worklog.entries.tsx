import type { Route } from './+types/api.worklog.entries.ts'
import type { AccessibleResource, Project } from '~/lib/atlassian/index.ts'

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

	// const dateRange = resolveDateRange(query)
	const userIds = query['filter[user]']
	const fromDate = query['filter[from]']

	return []
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
