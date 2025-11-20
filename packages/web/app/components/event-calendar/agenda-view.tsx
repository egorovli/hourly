import type { CalendarEvent } from './types.ts'

import { useMemo } from 'react'
import { addDays, format, isToday } from 'date-fns'
import { RiCalendarEventLine } from '@remixicon/react'

import { AgendaDaysToShow } from './constants.ts'
import { EventItem } from './event-item.tsx'
import { getAgendaEventsForDay } from './utils.ts'

interface AgendaViewProps {
	currentDate: Date
	events: CalendarEvent[]
	onEventSelect: (event: CalendarEvent) => void
}

export function AgendaView({ currentDate, events, onEventSelect }: AgendaViewProps) {
	// Show events for the next days based on constant
	const days = useMemo(() => {
		return Array.from({ length: AgendaDaysToShow }, (_, i) => addDays(new Date(currentDate), i))
	}, [currentDate])

	const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
		e.stopPropagation()
		onEventSelect(event)
	}

	// Check if there are any days with events
	const hasEvents = days.some(day => getAgendaEventsForDay(events, day).length > 0)

	return (
		<div className='border-t border-border/70 px-4'>
			{hasEvents ? (
				days.map(day => {
					const dayEvents = getAgendaEventsForDay(events, day)

					if (dayEvents.length === 0) {
						return null
					}

					return (
						<div
							key={day.toString()}
							className='relative my-12 border-t border-border/70'
						>
							<span
								className='absolute -top-3 left-0 flex h-6 items-center bg-background pe-4 text-[10px] uppercase data-today:font-medium sm:pe-4 sm:text-xs'
								data-today={isToday(day) || undefined}
							>
								{format(day, 'd MMM, EEEE')}
							</span>
							<div className='mt-6 space-y-2'>
								{dayEvents.map(event => (
									<EventItem
										key={event.id}
										event={event}
										view='agenda'
										onClick={(e: React.MouseEvent) => handleEventClick(event, e)}
									/>
								))}
							</div>
						</div>
					)
				})
			) : (
				<div className='flex min-h-[70svh] flex-col items-center justify-center py-16 text-center'>
					<RiCalendarEventLine
						size={32}
						className='mb-2 text-muted-foreground/50'
					/>
					<h3 className='text-lg font-medium'>No events found</h3>
					<p className='text-muted-foreground'>
						There are no events scheduled for this time period.
					</p>
				</div>
			)}
		</div>
	)
}
