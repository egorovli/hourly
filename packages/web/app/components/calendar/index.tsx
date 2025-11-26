import type { JiraWorklog } from '~/lib/atlassian/client.ts'

import FullCalendar from '@fullcalendar/react'
import type { DatesSetArg, EventInput } from '@fullcalendar/core'
import timeGridPlugin from '@fullcalendar/timegrid'
import { useEffect, useState, useMemo } from 'react'

interface CalendarProps {
	worklogs?: JiraWorklog[]
	onDatesSet?: (start: Date, end: Date) => void
}

function convertWorklogToEvent(worklog: JiraWorklog): EventInput {
	const startDate = new Date(worklog.started)
	const endDate = new Date(startDate.getTime() + worklog.timeSpentSeconds * 1000)

	return {
		id: worklog.id,
		title: `${worklog.author.displayName} - ${formatDuration(worklog.timeSpentSeconds)}`,
		start: startDate.toISOString(),
		end: endDate.toISOString(),
		allDay: false,
		extendedProps: {
			issueId: worklog.issueId,
			author: worklog.author.displayName,
			timeSpentSeconds: worklog.timeSpentSeconds
		}
	}
}

function formatDuration(seconds: number): string {
	const hours = Math.floor(seconds / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)

	if (hours > 0 && minutes > 0) {
		return `${hours}h ${minutes}m`
	}
	if (hours > 0) {
		return `${hours}h`
	}
	return `${minutes}m`
}

export function Calendar({ worklogs = [], onDatesSet }: CalendarProps): React.ReactNode {
	const [displayCalendar, setDisplayCalendar] = useState(false)

	const events = useMemo(() => {
		return worklogs.map(convertWorklogToEvent)
	}, [worklogs])

	const handleDatesSet = (arg: DatesSetArg) => {
		if (onDatesSet) {
			onDatesSet(arg.start, arg.end)
		}
	}

	useEffect(() => {
		setDisplayCalendar(true)
	}, [])

	if (!displayCalendar) {
		return null
	}

	return (
		<div className='w-full h-full'>
			<FullCalendar
				plugins={[timeGridPlugin]}
				initialView='timeGridWeek'
				height='100%'
				events={events}
				datesSet={handleDatesSet}
				firstDay={1}
			/>
		</div>
	)
}
