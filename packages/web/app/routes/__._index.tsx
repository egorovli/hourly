import type { MetaDescriptor } from 'react-router'
import type { Route } from './+types/__._index.ts'
import type { DatesSetArg, EventInput } from '@fullcalendar/core'
//
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { Suspense, useEffect, useState, useMemo } from 'react'

import { lazy } from 'react'

// const FullCalendar = lazy(() => import('@fullcalendar/react'))

export default function IndexPage(): React.ReactNode {
	const [displayCalendar, setDisplayCalendar] = useState(false)

	useEffect(() => {
		setTimeout(() => {
			setDisplayCalendar(true)
		}, 1000)
	}, [])

	if (!displayCalendar) {
		return null
	}

	return (
		<div className='w-full h-full'>
			<Suspense fallback={<div>Loading...</div>}>
				<FullCalendar
					plugins={[timeGridPlugin]}
					initialView='timeGridWeek'
					height='100%'
					events={[]}
					datesSet={() => {}}
					firstDay={1}
				/>
			</Suspense>
		</div>
	)
}

export async function loader({ request }: Route.LoaderArgs) {
	return {}
}

export function meta(args: Route.MetaArgs): MetaDescriptor[] {
	const title = 'Calendar • Hourly'

	const description =
		'View and manage your worklog entries on an interactive calendar. Filter by projects, drag and drop to edit time entries, and sync changes back to Jira.'

	const keywords =
		'worklog calendar, time tracking calendar, Jira worklog, time entries, calendar view, worklog management, time allocation calendar'

	return [
		{ title },
		{ name: 'description', content: description },
		{ name: 'keywords', content: keywords },

		// Open Graph tags
		{ property: 'og:type', content: 'website' },
		{ property: 'og:title', content: title },
		{ property: 'og:description', content: description },
		// { property: 'og:url', content: `${baseUrl}${pathname}` },

		// Twitter Card tags
		{ name: 'twitter:card', content: 'summary' },
		{ name: 'twitter:title', content: title },
		{ name: 'twitter:description', content: description }
	]
}
