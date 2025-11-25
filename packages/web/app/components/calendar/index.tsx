import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { useEffect, useState } from 'react'

// const events =

export function Calendar(): React.ReactNode {
	const [displayCalendar, setDisplayCalendar] = useState(false)

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
				events='https://fullcalendar.io/api/demo-feeds/events.json'
			/>
		</div>
	)
}
