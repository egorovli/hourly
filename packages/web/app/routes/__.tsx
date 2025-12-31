import type { Route } from './+types/__.ts'

import { Outlet, redirect } from 'react-router'
import { wrap } from '@mikro-orm/core'

import {
	orm,
	ProfileSessionConnection,
	Session,
	withRequestContext
} from '~/lib/mikro-orm/index.ts'

import { createSessionStorage } from '~/lib/session/index.ts'
import { ProfileConnectionType } from '~/domain/index.ts'

function Header(): React.ReactNode {
	return (
		<div className='h-16 bg-red-500'>
			<h1>Header</h1>
		</div>
	)
}

export default function AuthenticatedLayout({ loaderData }: Route.ComponentProps): React.ReactNode {
	return (
		<div className='h-full'>
			<Header />
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

	const { em } = orm
	const sessionStorage = createSessionStorage()
	const cookieSession = await sessionStorage.getSession(request.headers.get('Cookie'))

	if (!cookieSession || !cookieSession.id) {
		redirectToSignIn()
	}

	const session = await em.findOne(Session, {
		id: cookieSession.id
	})

	if (!session) {
		redirectToSignIn()
	}

	const connection = await em.findOne(
		ProfileSessionConnection,
		{
			session: {
				id: session.id
			},
			connectionType: ProfileConnectionType.WorklogTarget
		},
		{
			populate: ['profile']
		}
	)

	if (!connection) {
		redirectToSignIn()
	}

	return {
		profile: wrap(connection.profile).toObject()
	}
})
