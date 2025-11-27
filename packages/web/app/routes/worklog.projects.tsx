import type { Route } from './+types/worklog.projects.ts'
import type { WorklogProject } from '~/modules/worklogs/domain/worklog-project.ts'

import { ProfileConnectionType } from '~/domain/index.ts'
import { AtlassianClient } from '~/lib/atlassian/index.ts'
import { Provider } from '~/lib/auth/strategies/common.ts'
import { orm, ProfileSessionConnection, Token, withRequestContext } from '~/lib/mikro-orm/index.ts'
import { createSessionStorage } from '~/lib/session/index.ts'
import { AtlassianWorklogProjectRepository } from '~/modules/worklogs/infrastructure/atlassian/atlassian-worklog-project-repository.ts'
import { FindAllWorklogProjectsUseCase } from '~/modules/worklogs/use-cases/find-all-worklog-projects.use-case.ts'

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

	// Create Atlassian client
	const client = new AtlassianClient({
		accessToken: token.accessToken,
		refreshToken: token.refreshToken
	})

	// Wire up clean architecture dependencies
	const repository = new AtlassianWorklogProjectRepository(client)
	const useCase = new FindAllWorklogProjectsUseCase(repository)

	// Execute use case to get hierarchical projects
	try {
		const projects: WorklogProject[] = await useCase.execute({
			signal: request.signal
		})

		return Response.json({ projects })
	} catch (error) {
		// If request was aborted, return empty result
		if (error instanceof Error && error.name === 'AbortError') {
			return Response.json({ projects: [] })
		}
		const errorMessage = error instanceof Error ? error.message : String(error)
		return Response.json({ error: `Failed to fetch projects: ${errorMessage}` }, { status: 500 })
	}
})
