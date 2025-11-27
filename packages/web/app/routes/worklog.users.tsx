import type { Route } from './+types/worklog.users.ts'
import type { WorklogAuthor } from '~/modules/worklogs/domain/worklog-author.ts'

import { z } from 'zod'

import { ProfileConnectionType } from '~/domain/index.ts'
import { AtlassianClient } from '~/lib/atlassian/index.ts'
import { Provider } from '~/lib/auth/strategies/common.ts'
import { orm, ProfileSessionConnection, Token, withRequestContext } from '~/lib/mikro-orm/index.ts'
import { createSessionStorage } from '~/lib/session/index.ts'
import { AtlassianWorklogAuthorRepository } from '~/modules/worklogs/infrastructure/atlassian/atlassian-worklog-author-repository.ts'
import { FindWorklogAuthorsUseCase } from '~/modules/worklogs/use-cases/find-worklog-authors.use-case.ts'

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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Loader coordinates auth, validation, and provider fetch with fallbacks
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

	const repository = new AtlassianWorklogAuthorRepository(client)
	const useCase = new FindWorklogAuthorsUseCase(repository)

	try {
		const users: WorklogAuthor[] = await useCase.execute({
			signal: request.signal,
			projectIds,
			maxResults,
			query
		})

		return Response.json({ users })
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			return Response.json({ users: [] })
		}
		const errorMessage = error instanceof Error ? error.message : String(error)
		return Response.json({ error: `Failed to fetch users: ${errorMessage}` }, { status: 500 })
	}
})
