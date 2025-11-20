import type { Route } from './+types/__._index.ts'

import Component from '~/components/comp-542.tsx'

export default function CalendarPage({ loaderData }: Route.ComponentProps) {
	return (
		<div className='flex h-full flex-1'>
			<Component />
		</div>
	)
}

export async function loader({ request }: Route.LoaderArgs) {
	return {}
}
