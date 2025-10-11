import type { Route } from './+types/auth.atlassian.callback.ts'

import { redirect } from 'react-router'

import { authenticator } from '../lib/auth/index.server.js'
import * as sessionStorage from '../lib/session/index.ts'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function loader({ request, context }: Route.LoaderArgs) {
	const user = await authenticator.authenticate('atlassian', request)

	console.log('Authenticated user:', user)

	const session = await sessionStorage.getSession(request.headers.get('Cookie'))
	session.set('user', user)
	console.log('Session after setting user:', session)

	console.log({
		headers: {
			'Set-Cookie': await sessionStorage.commitSession(session, {
				maxAge: undefined,
				expires: new Date(user.expiresAt ?? new Date())
			})
		}
	})

	return redirect('/', {
		headers: {
			'Set-Cookie': await sessionStorage.commitSession(session, {
				maxAge: undefined,
				expires: new Date('2026-01-01T00:00:00Z') // new Date(user.expiresAt ?? new Date())
			})
		}
	})
}
