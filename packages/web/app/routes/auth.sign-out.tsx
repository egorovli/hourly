import type { Route } from './+types/auth.sign-out.ts'

import { redirect } from 'react-router'

import * as sessionStorage from '~/lib/session/storage.ts'

export async function loader({ request }: Route.LoaderArgs) {
	const cookie = request.headers.get('Cookie')
	const session = await sessionStorage.getSession(cookie)

	return redirect('/auth/sign-in', {
		headers: {
			'Set-Cookie': await sessionStorage.destroySession(session)
		}
	})
}
