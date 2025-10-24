import type { Route } from './+types/jira.users.ts'

import { invariant } from '~/lib/util/invariant.ts'

import { AtlassianClient, type JiraProject, type JiraUser } from '~/lib/atlassian/index.ts'
import { orm, Token } from '~/lib/mikro-orm/index.ts'
import * as sessionStorage from '~/lib/session/storage.ts'

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

	const url = new URL(request.url)
	const projectIds = url.searchParams.getAll('projectId').filter(Boolean)

	if (projectIds.length === 0) {
		return {
			users: []
		}
	}

	const selectedProjectIds = new Set(projectIds)

	const resources = await client.getAccessibleResources()
	const projectsByResource: Record<string, JiraProject[]> = {}

	await Promise.all(
		resources.map(async resource => {
			const { projects } = await client.listJiraProjects(resource.id)
			const selected = projects.filter(project => selectedProjectIds.has(project.id))

			if (selected.length > 0) {
				projectsByResource[resource.id] = selected
			}
		})
	)

	const resourceEntries = Object.entries(projectsByResource)
	if (resourceEntries.length === 0) {
		return {
			users: []
		}
	}

	const usersByResource: Record<string, JiraUser[]> = {}

	await Promise.all(
		resourceEntries.map(async ([resourceId, projects]) => {
			const dedupedUsers = new Map<string, JiraUser>()

			await Promise.all(
				projects.map(async project => {
					// TODO: implement pagination
					const users = await client.listAssignableUsers(resourceId, {
						projectKey: project.key
					})

					for (const user of users) {
						if (!dedupedUsers.has(user.accountId)) {
							dedupedUsers.set(user.accountId, user)
						}
					}
				})
			)

			usersByResource[resourceId] = Array.from(dedupedUsers.values())
		})
	)

	return {
		users: Object.values(usersByResource).flat()
	}
}
