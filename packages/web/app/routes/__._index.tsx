import type { Route } from './+types/__._index.ts'

export default function CalendarPage({ loaderData }: Route.ComponentProps) {
	return (
		<div className='flex h-full flex-1 items-center justify-center'>
			<h1 className='text-2xl font-semibold'>Hello World</h1>
		</div>
	)
}

export async function loader({ request }: Route.LoaderArgs) {
	return {}
}
