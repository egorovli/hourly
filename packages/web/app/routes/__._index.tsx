import type { Route } from './+types/__._index.ts'

import { useEffect, useState, lazy, Suspense } from 'react'

const Calendar = lazy(() =>
	import('~/components/calendar/index.tsx').then(m => ({ default: m.Calendar }))
)

export default function CalendarPage({ loaderData }: Route.ComponentProps) {
	const [displayCalendar, setDisplayCalendar] = useState(false)

	useEffect(() => {
		setDisplayCalendar(true)
	}, [])

	return (
		<div className='flex h-full flex-1'>
			<Suspense fallback={<div>Loading...</div>}>
				<Calendar />
			</Suspense>
		</div>
	)
}

export async function loader({ request }: Route.LoaderArgs) {
	return {}
}
