import type { WorklogEntity } from '~/domain/entities/worklog-entity.ts'

import FullCalendar from '@fullcalendar/react'
import type { DatesSetArg, EventInput } from '@fullcalendar/core'
import timeGridPlugin from '@fullcalendar/timegrid'
import { useEffect, useState, useMemo } from 'react'

interface CalendarProps {
	worklogs?: WorklogEntity[]
	onDatesSet?: (start: Date, end: Date) => void
}

function convertWorklogToEvent(worklog: WorklogEntity): EventInput {
	const durationSeconds = Math.floor(
		(worklog.finishedAt.getTime() - worklog.startedAt.getTime()) / 1000
	)

	return {
		id: worklog.id,
		title: `${worklog.author.name} - ${formatDuration(durationSeconds)}`,
		start: worklog.startedAt.toISOString(),
		end: worklog.finishedAt.toISOString(),
		allDay: false,
		extendedProps: {
			author: worklog.author.name,
			authorId: worklog.author.id,
			durationSeconds
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
