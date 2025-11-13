import type { Route } from './+types/auth.sign-out.ts'

import { redirect } from 'react-router'

import { createSessionStorage } from '~/lib/session/index.ts'

import {
	orm,
	ProfileSessionConnection,
	Session,
	withRequestContext
} from '~/lib/mikro-orm/index.ts'

export const action = withRequestContext(async function action({ request }: Route.ActionArgs) {
	const sessionStorage = createSessionStorage()
	const cookieSession = await sessionStorage.getSession(request.headers.get('Cookie'))

	const session = await orm.em.findOne(Session, { id: cookieSession.id })

	if (session) {
		// Delete all profile connections for this session
		const connections = await orm.em.find(ProfileSessionConnection, {
			session: { id: session.id }
		})

		for (const connection of connections) {
			orm.em.remove(connection)
		}

		// Delete the session entity itself
		orm.em.remove(session)
		await orm.em.flush()
	}

	return redirect('/auth/sign-in', {
		headers: {
			'Set-Cookie': await sessionStorage.destroySession(cookieSession)
		}
	})
})
