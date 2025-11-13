import type React from 'react'
import type { Route } from './+types/__.ts'

import { Outlet } from 'react-router'

import * as sessionStorage from '~/lib/session/index.ts'

export default function CommonLayout({ loaderData }: Route.ComponentProps): React.ReactNode {
	// const session = await sessionStorage.getSession(request.headers.get('Cookie'))

	return (
		<div>
			<Outlet />

			<pre>{JSON.stringify(loaderData, null, 2)}</pre>
		</div>
	)
}

export async function loader({ request }: Route.LoaderArgs) {
	// TODO: Implement common layout loader
	// throw new Error('Not implemented')

	const session = await sessionStorage.getSession(request.headers.get('Cookie'))

	return {
		session
	}
}
