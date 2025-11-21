import type { CalendarEvent } from './types.ts'

import { useMemo } from 'react'
import { differenceInMinutes, format, getMinutes, isPast } from 'date-fns'

import { getBorderRadiusClasses, getEventColorClasses, cn } from './utils.ts'

// Using date-fns format with custom formatting:
// 'h' - hours (1-12)
// 'a' - am/pm
// ':mm' - minutes with leading zero (only if the token 'mm' is present)
const formatTimeWithOptionalMinutes = (date: Date) => {
	return format(date, getMinutes(date) === 0 ? 'ha' : 'h:mma').toLowerCase()
}

interface EventWrapperProps {
	event: CalendarEvent
	isFirstDay?: boolean
	isLastDay?: boolean
	className?: string
	children: React.ReactNode
	currentTime?: Date
}

// Shared wrapper component for event styling
function EventWrapper({
	event,
	isFirstDay = true,
	isLastDay = true,
	className,
	children,
	currentTime
}: EventWrapperProps) {
	// Always use the currentTime (if provided) to determine if the event is in the past
	const displayEnd = currentTime
		? new Date(
				new Date(currentTime).getTime() +
					(new Date(event.end).getTime() - new Date(event.start).getTime())
			)
		: new Date(event.end)

	const isEventInPast = isPast(displayEnd)

	return (
		<div
			className={cn(
				'flex size-full overflow-hidden px-1 text-left font-medium backdrop-blur-md transition select-none data-past-event:line-through sm:px-2',
				getEventColorClasses(event.color),
				getBorderRadiusClasses(isFirstDay, isLastDay),
				className
			)}
			data-past-event={isEventInPast || undefined}
		>
			{children}
		</div>
	)
}

interface EventItemProps {
	event: CalendarEvent
	view: 'week'
	showTime?: boolean
	isFirstDay?: boolean
	isLastDay?: boolean
	children?: React.ReactNode
	className?: string
}

export function EventItem({
	event,
	view,
	showTime,
	isFirstDay = true,
	isLastDay = true,
	children,
	className
}: EventItemProps) {
	const displayStart = useMemo(() => new Date(event.start), [event.start])
	const displayEnd = useMemo(() => new Date(event.end), [event.end])

	// Calculate event duration in minutes
	const durationMinutes = useMemo(() => {
		return differenceInMinutes(displayEnd, displayStart)
	}, [displayStart, displayEnd])

	const getEventTime = () => {
		if (event.allDay) {
			return 'All day'
		}

		// For short events (less than 45 minutes), only show start time
		if (durationMinutes < 45) {
			return formatTimeWithOptionalMinutes(displayStart)
		}

		// For longer events, show both start and end time
		return `${formatTimeWithOptionalMinutes(displayStart)} - ${formatTimeWithOptionalMinutes(displayEnd)}`
	}

	return (
		<EventWrapper
			event={event}
			isFirstDay={isFirstDay}
			isLastDay={isLastDay}
			className={cn(
				'py-1',
				durationMinutes < 45 ? 'items-center' : 'flex-col',
				'text-[10px] sm:text-xs',
				className
			)}
		>
			{durationMinutes < 45 ? (
				<div className='truncate'>
					{event.title}{' '}
					{showTime && (
						<span className='opacity-70'>{formatTimeWithOptionalMinutes(displayStart)}</span>
					)}
				</div>
			) : (
				<>
					<div className='truncate font-medium'>{event.title}</div>
					{showTime && (
						<div className='truncate font-normal opacity-70 sm:text-[11px]'>{getEventTime()}</div>
					)}
				</>
			)}
		</EventWrapper>
	)
}
