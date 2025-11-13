import type { Route } from './+types/auth.sign-out.ts'

import { RequestContext } from '@mikro-orm/core'
import { redirect } from 'react-router'

import { orm } from '~/lib/mikro-orm/index.ts'
import { createSessionStorage } from '~/lib/session/index.ts'

export async function loader({ request }: Route.LoaderArgs) {
	return RequestContext.create(orm.em, async () => {
		const cookie = request.headers.get('Cookie')
		const sessionStorage = createSessionStorage()
		const session = await sessionStorage.getSession(cookie)

		return redirect('/auth/sign-in', {
			headers: {
				'Set-Cookie': await sessionStorage.destroySession(session)
			}
		})
	})
}
