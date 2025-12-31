import type { Route } from './+types/__.ts'

import { Outlet, redirect } from 'react-router'

import { withRequestContext } from '~/lib/mikro-orm/index.ts'
import { createSessionStorage } from '~/lib/session/index.ts'

export default function AuthenticatedLayout({ loaderData }: Route.ComponentProps): React.ReactNode {
	return (
		<div className='h-full'>
			<Outlet />
		</div>
	)
}

export let loader = withRequestContext(async function loader({ request }: Route.LoaderArgs) {
	const sessionStorage = createSessionStorage()
	const cookieSession = await sessionStorage.getSession(request.headers.get('Cookie'))

	if (!cookieSession || !cookieSession.id) {
		redirectToSignIn()
	}

	return {
		session: cookieSession
	}

	function redirectToSignIn(): never {
		const url = new URL(request.url)

		const target =
			url.pathname === '/'
				? '/auth/sign-in'
				: `/auth/sign-in?redirected-from=${encodeURIComponent(url.pathname + url.search)}`

		throw redirect(target)
	}
})
