import type { Route } from './+types/auth.$provider.sign-out.ts'

import { redirect } from 'react-router'
import { z } from 'zod'

import { createSessionStorage } from '~/lib/session/index.ts'

import {
	orm,
	ProfileSessionConnection,
	Session,
	withRequestContext
} from '~/lib/mikro-orm/index.ts'

const schema = {
	action: {
		params: z.object({
			provider: z.string()
		})
	}
}

export const action = withRequestContext(async function action({
	request,
	...args
}: Route.ActionArgs) {
	const url = new URL(request.url)
	const redirectedFrom = url.searchParams.get('redirected-from') ?? undefined
	const sessionStorage = createSessionStorage()

	const params = schema.action.params.parse(args.params)
	const cookieSession = await sessionStorage.getSession(request.headers.get('Cookie'))

	const session = await orm.em.findOne(Session, { id: cookieSession.id })

	if (session) {
		// Find all connections for this session and provider
		const connections = await orm.em.find(
			ProfileSessionConnection,
			{
				session: { id: session.id }
			},
			{
				populate: ['profile']
			}
		)

		// Filter connections for this provider and delete them
		const providerConnections = connections.filter(
			connection => connection.profile.provider === params.provider
		)

		for (const connection of providerConnections) {
			orm.em.remove(connection)
		}

		await orm.em.flush()

		// Check if there are any remaining connections for this session
		const remainingConnections = await orm.em.find(ProfileSessionConnection, {
			session: { id: session.id }
		})

		// If no remaining connections, delete the session entity and destroy cookie
		if (remainingConnections.length === 0) {
			orm.em.remove(session)
			await orm.em.flush()

			return redirect(redirectedFrom ?? '/auth/sign-in', {
				headers: {
					'Set-Cookie': await sessionStorage.destroySession(cookieSession)
				}
			})
		}
	}

	// If there are remaining connections, just commit the session
	const setCookieHeader = await sessionStorage.commitSession(cookieSession)

	return redirect(redirectedFrom ?? '/', {
		headers: {
			'Set-Cookie': setCookieHeader
		}
	})
})
