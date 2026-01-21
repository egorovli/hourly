import type { Route } from './+types/api.issues.ts'
import type { AccessibleResource, Project } from '~/lib/atlassian/index.ts'

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
			'filter[to]': z.iso.datetime().optional(),
			'filter[query]': z.string().trim().optional(),

			'page[number]': z.coerce.number().int().min(1).optional().default(1),
			'page[size]': z.coerce.number().int().min(1).max(100).optional().default(50)
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
		'filter[to]': url.searchParams.get('filter[to]') ?? undefined,
		'filter[query]': url.searchParams.get('filter[query]') ?? undefined,
		'page[number]': url.searchParams.get('page[number]') ?? undefined,
		'page[size]': url.searchParams.get('page[size]') ?? undefined
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
	const searchQuery = query['filter[query]']
	const pageNumber = query['page[number]']
	const pageSize = query['page[size]']

	// Group projects by resource
	const projectsByResource = new Map<AccessibleResource['id'], ProjectWithResource[]>()

	for (const project of validatedProjects) {
		const existingProjects = projectsByResource.get(project.resourceId)

		if (existingProjects === undefined) {
			projectsByResource.set(project.resourceId, [project])
			continue
		}

		existingProjects.push(project)
	}

	// Search issues across all resources in parallel
	const issueResults = await Promise.all(
		Array.from(projectsByResource.entries()).map(([resourceId, resourceProjects]) =>
			auth.client.searchIssues({
				accessibleResourceId: resourceId,
				projectKeys: resourceProjects.map(project => project.key),
				userAccountIds: userIds.length > 0 ? userIds : undefined,
				dateFrom: fromDate,
				dateTo: toDate,
				query: searchQuery,
				maxResults: pageSize,
				signal: request.signal
			})
		)
	)

	// Merge results from all resources
	const allIssues = issueResults.flatMap(result => result.issues)
	const totalCount = issueResults.reduce((sum, result) => sum + result.total, 0)

	// Sort by updated date (most recent first)
	allIssues.sort((a, b) => {
		const dateA = a.fields.updated ? new Date(a.fields.updated).getTime() : 0
		const dateB = b.fields.updated ? new Date(b.fields.updated).getTime() : 0
		return dateB - dateA
	})

	const returnedIssues = allIssues.slice(0, pageSize)

	auditLogger?.log(
		auditActions.dataRead.issues(
			{
				projectIds: query['filter[project]'],
				userIds: query['filter[user]'],
				from: query['filter[from]'],
				to: query['filter[to]'],
				query: query['filter[query]'],
				page: pageNumber,
				pageSize
			},
			returnedIssues.length
		)
	)

	return {
		issues: returnedIssues,
		total: totalCount,
		page: pageNumber,
		pageSize: pageSize
	}
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
