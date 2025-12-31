import type { Route } from './+types/auth.sign-out.ts'

import { redirect } from 'react-router'

import { createSessionStorage } from '~/lib/session/index.ts'

import {
	orm,
	ProfileSessionConnection,
	Session,
	withRequestContext
} from '~/lib/mikro-orm/index.ts'

type SignOutOptions = Pick<Route.LoaderArgs | Route.ActionArgs, 'request'>

async function signOut({ request }: SignOutOptions): Promise<Response> {
	const { em } = orm
	const sessionStorage = createSessionStorage()
	const cookieSession = await sessionStorage.getSession(request.headers.get('Cookie'))

	const session = await em.findOne(Session, { id: cookieSession.id })

	if (session) {
		const connections = await em.find(ProfileSessionConnection, {
			session: { id: session.id }
		})

		for (const connection of connections) {
			em.remove(connection)
		}

		em.remove(session)
		await em.flush()
	}

	return redirect('/auth/sign-in', {
		headers: {
			'Set-Cookie': await sessionStorage.destroySession(cookieSession)
		}
	})
}

export const action = withRequestContext(async function action({ request }: Route.ActionArgs) {
	return signOut({ request })
})

export const loader = withRequestContext(async function loader({ request }: Route.LoaderArgs) {
	return signOut({ request })
})
