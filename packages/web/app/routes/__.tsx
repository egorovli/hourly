import type { Route } from './+types/__.ts'

import { Outlet } from 'react-router'

import { withRequestContext } from '~/lib/mikro-orm/index.ts'

export default function CommonLayout({ loaderData }: Route.ComponentProps): React.ReactNode {
	return (
		<div className='h-full'>
			<Outlet />
		</div>
	)
}

export let loader = withRequestContext(async function loader({ request }: Route.LoaderArgs) {
	return {}
})
