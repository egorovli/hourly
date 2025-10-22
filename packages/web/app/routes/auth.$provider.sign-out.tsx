import { redirect } from 'react-router'
import type { Route } from './+types/auth.$provider.sign-out.ts'

import { z } from 'zod'

import * as sessionStorage from '~/lib/session/storage.ts'

const schema = {
	loader: {
		params: z.object({
			provider: z.string()
		})
	}
}

export async function loader({ request, ...args }: Route.LoaderArgs) {
	const params = schema.loader.params.parse(args.params)
	const cookie = request.headers.get('Cookie')
	const session = await sessionStorage.getSession(cookie)

	const user = session.get('user')

	if (params.provider === 'atlassian' && user?.atlassian) {
		const { atlassian: _, ...rest } = user

		if (rest.gitlab) {
			session.set('user', rest)

			return redirect('/auth/sign-in', {
				headers: {
					'Set-Cookie': await sessionStorage.commitSession(session)
				}
			})
		}
	}

	if (params.provider === 'gitlab' && user?.gitlab) {
		const { gitlab: _, ...rest } = user

		if (rest.atlassian) {
			session.set('user', rest)

			return redirect('/auth/sign-in', {
				headers: {
					'Set-Cookie': await sessionStorage.commitSession(session)
				}
			})
		}
	}

	return redirect('/auth/sign-in', {
		headers: {
			'Set-Cookie': await sessionStorage.destroySession(session)
		}
	})
}
