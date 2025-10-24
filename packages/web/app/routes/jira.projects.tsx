import type { Route } from './+types/jira.projects.ts'

import { invariant } from '~/lib/util/invariant.ts'

import * as sessionStorage from '~/lib/session/storage.ts'
import { orm, Token } from '~/lib/mikro-orm/index.ts'
import { AtlassianClient, type JiraProject } from '~/lib/atlassian/index.ts'

export async function loader({ request }: Route.LoaderArgs) {
	const session = await sessionStorage.getSession(request.headers.get('Cookie'))
	const user = session.get('user')

	invariant(user?.atlassian?.id, 'User is not authenticated with Atlassian')

	const em = orm.em.fork()
	const token = await em.findOne(Token, {
		profileId: user.atlassian.id,
		provider: 'atlassian'
	})

	invariant(token?.accessToken, 'Atlassian access token not found. Please reconnect your account.')

	const client = new AtlassianClient({
		accessToken: token.accessToken,
		refreshToken: token.refreshToken
	})

	const resources = await client.getAccessibleResources()
	const byResource: Record<string, JiraProject[]> = {}

	await Promise.all(
		resources.map(async resource => {
			// TODO: handle pagination, fetch all projects!
			const { projects } = await client.listJiraProjects(resource.id)
			byResource[resource.id] = projects
		})
	)

	return {
		resources,
		byResource
	}
}
