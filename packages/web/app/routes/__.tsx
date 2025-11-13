import type React from 'react'
import type { Route } from './+types/__.ts'

import { RequestContext } from '@mikro-orm/core'
import { Outlet } from 'react-router'

import { orm } from '~/lib/mikro-orm/index.ts'
import { createSessionStorage } from '~/lib/session/index.ts'

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
	return RequestContext.create(orm.em, async () => {
		// TODO: Implement common layout loader
		// throw new Error('Not implemented')

		const sessionStorage = createSessionStorage()
		const session = await sessionStorage.getSession(request.headers.get('Cookie'))

		return {
			session
		}
	})
}
