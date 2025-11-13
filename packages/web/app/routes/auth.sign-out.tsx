import type { Route } from './+types/auth.sign-out.ts'

import { redirect } from 'react-router'

import { createSessionStorage } from '~/lib/session/index.ts'
import { withRequestContext } from '~/lib/mikro-orm/index.ts'

export const loader = withRequestContext(async function loader({ request }: Route.LoaderArgs) {
	const cookie = request.headers.get('Cookie')
	const sessionStorage = createSessionStorage()
	const session = await sessionStorage.getSession(cookie)

	return redirect('/auth/sign-in', {
		headers: {
			'Set-Cookie': await sessionStorage.destroySession(session)
		}
	})
})
