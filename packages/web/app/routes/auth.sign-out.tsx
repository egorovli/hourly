import { redirect } from 'react-router'
import type { Route } from './+types/auth.sign-out.ts'

import { destroySession, getSession } from '~/lib/session/storage.ts'

export async function loader({ request }: Route.LoaderArgs) {
	const cookie = request.headers.get('Cookie')
	const session = await getSession(cookie)

	return redirect('/auth/sign-in', {
		headers: {
			'Set-Cookie': await destroySession(session)
		}
	})
}
