import type { Route } from './+types/auth.sign-out.ts'

import { redirect } from 'react-router'

import { createSessionStorage } from '~/lib/session/index.ts'

import {
	orm,
	ProfileSessionConnection,
	Session,
	withRequestContext
} from '~/lib/mikro-orm/index.ts'

export const loader = withRequestContext(async function loader({ request }: Route.LoaderArgs) {
	const { em } = orm
	const sessionStorage = createSessionStorage()
	const cookieSession = await sessionStorage.getSession(request.headers.get('Cookie'))

	// Find the session in the database
	const session = await em.findOne(Session, { id: cookieSession.id })

	if (session) {
		// Delete all profile connections for this session
		const connections = await em.find(ProfileSessionConnection, {
			session: { id: session.id }
		})

		for (const connection of connections) {
			em.remove(connection)
		}

		// Delete the session entity itself
		em.remove(session)
		await em.flush()
	}

	// Destroy the session cookie and redirect to sign-in
	return redirect('/auth/sign-in', {
		headers: {
			'Set-Cookie': await sessionStorage.destroySession(cookieSession)
		}
	})
})
