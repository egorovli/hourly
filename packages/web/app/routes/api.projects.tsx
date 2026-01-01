import { createSessionStorage } from '~/lib/session/index.ts'
import type { Route } from './+types/api.projects.ts'

import {
	orm,
	ProfileSessionConnection,
	Session,
	Token,
	withRequestContext
} from '~/lib/mikro-orm/index.ts'

import { ProfileConnectionType } from '~/domain/index.ts'
import { AtlassianClient } from '~/lib/atlassian/index.ts'
import { cached } from '~/lib/cached/index.ts'

export const loader = withRequestContext(async function loader({ request }: Route.LoaderArgs) {
	const { em } = orm
	const sessionStorage = createSessionStorage()
	const cookieSession = await sessionStorage.getSession(request.headers.get('Cookie'))

	if (!cookieSession || !cookieSession.id) {
		throw new Error('Unauthorized')
	}

	const session = await em.findOne(Session, {
		id: cookieSession.id
	})

	if (!session) {
		throw new Error('Unauthorized')
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
		throw new Error('Unauthorized')
	}

	const { profile } = connection

	const token = await em.findOne(Token, {
		profileId: profile.id,
		provider: profile.provider
	})

	if (!token) {
		throw new Error('Unauthorized')
	}

	const client = new AtlassianClient({ accessToken: token.accessToken })

	const getAccessibleResources = cached(client.getAccessibleResources.bind(client))
	const getProjects = cached(client.getProjects.bind(client))

	const accessibleResources = await getAccessibleResources()

	const projects = await Promise.all(
		accessibleResources.map(async resource => getProjects(resource.id))
	)

	return projects.flat()
})
