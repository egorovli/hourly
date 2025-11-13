import type React from 'react'
import type { Route } from './+types/__.ts'

import { Outlet, redirect } from 'react-router'

import { ProfileConnectionType } from '~/domain/index.ts'
import { orm, ProfileSessionConnection, withRequestContext } from '~/lib/mikro-orm/index.ts'
import { createSessionStorage } from '~/lib/session/index.ts'

export default function CommonLayout({ loaderData }: Route.ComponentProps): React.ReactNode {
	return (
		<div>
			<Outlet />

			<pre>{JSON.stringify(loaderData, null, 2)}</pre>
		</div>
	)
}

export let loader = withRequestContext(async function loader({ request }: Route.LoaderArgs) {
	function redirectToSignIn(): never {
		const url = new URL(request.url)

		const target =
			url.pathname === '/'
				? '/auth/sign-in'
				: `/auth/sign-in?redirected-from=${encodeURIComponent(url.pathname + url.search)}`

		throw redirect(target)
	}

	const sessionStorage = createSessionStorage()
	const cookieSession = await sessionStorage.getSession(request.headers.get('Cookie'))

	// Check if session exists
	if (!cookieSession || !cookieSession.id) {
		redirectToSignIn()
	}

	// Check if session has worklog target profile connection
	const worklogTargetConnection = await orm.em.findOne(ProfileSessionConnection, {
		session: { id: cookieSession.id },
		connectionType: ProfileConnectionType.WorklogTarget
	})

	if (!worklogTargetConnection) {
		redirectToSignIn()
	}

	return {
		session: cookieSession
	}
})
