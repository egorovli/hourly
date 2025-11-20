import type { CalendarEvent } from './types.ts'
import type React from 'react'

import { useEffect, useMemo, useState } from 'react'
import {
	addDays,
	eachDayOfInterval,
	endOfMonth,
	endOfWeek,
	format,
	isSameDay,
	isSameMonth,
	isToday,
	startOfMonth,
	startOfWeek
} from 'date-fns'

import { DraggableEvent } from './draggable-event.tsx'
import { DroppableCell } from './droppable-cell.tsx'
import { EventItem } from './event-item.tsx'
import { useEventVisibility } from './hooks/use-event-visibility.ts'
import { EventGap, EventHeight } from './constants.ts'
import {
	getAllEventsForDay,
	getEventsForDay,
	getSpanningEventsForDay,
	sortEvents
} from './utils.ts'
import { DefaultStartHour } from '~/components/event-calendar/constants.ts'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/shadcn/ui/popover.tsx'

interface MonthViewProps {
	currentDate: Date
	events: CalendarEvent[]
	onEventSelect: (event: CalendarEvent) => void
	onEventCreate: (startTime: Date) => void
}

export function MonthView({ currentDate, events, onEventSelect, onEventCreate }: MonthViewProps) {
	const days = useMemo(() => {
		const monthStart = startOfMonth(currentDate)
		const monthEnd = endOfMonth(monthStart)
		const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
		const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

		return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
	}, [currentDate])

	const weekdays = useMemo(() => {
		return Array.from({ length: 7 }).map((_, i) => {
			const date = addDays(startOfWeek(new Date()), i)
			return format(date, 'EEE')
		})
	}, [])

	const weeks = useMemo(() => {
		const result = []
		let week = []

		for (let i = 0; i < days.length; i++) {
			week.push(days[i])
			if (week.length === 7 || i === days.length - 1) {
				result.push(week)
				week = []
			}
		}

		return result
	}, [days])

	const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
		e.stopPropagation()
		onEventSelect(event)
	}

	const [isMounted, setIsMounted] = useState(false)
	const { contentRef, getVisibleEventCount } = useEventVisibility({
		eventHeight: EventHeight,
		eventGap: EventGap
	})

	useEffect(() => {
		setIsMounted(true)
	}, [])

	return (
		<div
			data-slot='month-view'
			className='contents'
		>
			<div className='grid grid-cols-7 border-b border-border/70'>
				{weekdays.map(day => (
					<div
						key={day}
						className='py-2 text-center text-sm text-muted-foreground/70'
					>
						{day}
					</div>
				))}
			</div>
			<div className='grid flex-1 auto-rows-fr'>
				{weeks.map((week, weekIndex) => (
					<div
						key={`week-${weekIndex}`}
						className='grid grid-cols-7 [&:last-child>*]:border-b-0'
					>
						{week.map((day, dayIndex) => {
							if (!day) {
								return null // Skip if day is undefined
							}

							const dayEvents = getEventsForDay(events, day)
							const spanningEvents = getSpanningEventsForDay(events, day)
							const isCurrentMonth = isSameMonth(day, currentDate)
							const cellId = `month-cell-${day.toISOString()}`
							const allDayEvents = [...spanningEvents, ...dayEvents]
							const allEvents = getAllEventsForDay(events, day)

							const isReferenceCell = weekIndex === 0 && dayIndex === 0
							const visibleCount = isMounted ? getVisibleEventCount(allDayEvents.length) : undefined
							const hasMore = visibleCount !== undefined && allDayEvents.length > visibleCount
							const remainingCount = hasMore ? allDayEvents.length - visibleCount : 0

							return (
								<div
									key={day.toString()}
									className='group border-r border-b border-border/70 last:border-r-0 data-outside-cell:bg-muted/25 data-outside-cell:text-muted-foreground/70'
									data-today={isToday(day) || undefined}
									data-outside-cell={!isCurrentMonth || undefined}
								>
									<DroppableCell
										id={cellId}
										date={day}
										onClick={() => {
											const startTime = new Date(day)
											startTime.setHours(DefaultStartHour, 0, 0)
											onEventCreate(startTime)
										}}
									>
										<div className='mt-1 inline-flex size-6 items-center justify-center rounded-full text-sm group-data-today:bg-primary group-data-today:text-primary-foreground'>
											{format(day, 'd')}
										</div>
										<div
											ref={isReferenceCell ? contentRef : null}
											className='min-h-[calc((var(--event-height)+var(--event-gap))*2)] sm:min-h-[calc((var(--event-height)+var(--event-gap))*3)] lg:min-h-[calc((var(--event-height)+var(--event-gap))*4)]'
										>
											{sortEvents(allDayEvents).map((event, index) => {
												const eventStart = new Date(event.start)
												const eventEnd = new Date(event.end)
												const isFirstDay = isSameDay(day, eventStart)
												const isLastDay = isSameDay(day, eventEnd)

												const isHidden = isMounted && visibleCount && index >= visibleCount

												if (!visibleCount) {
													return null
												}

												if (!isFirstDay) {
													return (
														<div
															key={`spanning-${event.id}-${day.toISOString().slice(0, 10)}`}
															className='aria-hidden:hidden'
															aria-hidden={isHidden ? 'true' : undefined}
														>
															<EventItem
																onClick={e => handleEventClick(event, e)}
																event={event}
																view='month'
																isFirstDay={isFirstDay}
																isLastDay={isLastDay}
															>
																<div
																	className='invisible'
																	aria-hidden={true}
																>
																	{!event.allDay && (
																		<span>{format(new Date(event.start), 'h:mm')} </span>
																	)}
																	{event.title}
																</div>
															</EventItem>
														</div>
													)
												}

												return (
													<div
														key={event.id}
														className='aria-hidden:hidden'
														aria-hidden={isHidden ? 'true' : undefined}
													>
														<DraggableEvent
															event={event}
															view='month'
															onClick={e => handleEventClick(event, e)}
															isFirstDay={isFirstDay}
															isLastDay={isLastDay}
														/>
													</div>
												)
											})}

											{hasMore && (
												<Popover modal>
													<PopoverTrigger asChild>
														<button
															type='button'
															className='mt-[var(--event-gap)] flex h-[var(--event-height)] w-full items-center overflow-hidden px-1 text-left text-[10px] text-muted-foreground backdrop-blur-md transition outline-none select-none hover:bg-muted/50 hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:px-2 sm:text-xs'
															onClick={e => e.stopPropagation()}
														>
															<span>
																+ {remainingCount} <span className='max-sm:sr-only'>more</span>
															</span>
														</button>
													</PopoverTrigger>
													<PopoverContent
														align='center'
														className='max-w-52 p-3'
														style={
															{
																'--event-height': `${EventHeight}px`
															} as React.CSSProperties
														}
													>
														<div className='space-y-2'>
															<div className='text-sm font-medium'>{format(day, 'EEE d')}</div>
															<div className='space-y-1'>
																{sortEvents(allEvents).map(event => {
																	const eventStart = new Date(event.start)
																	const eventEnd = new Date(event.end)
																	const isFirstDay = isSameDay(day, eventStart)
																	const isLastDay = isSameDay(day, eventEnd)

																	return (
																		<EventItem
																			key={event.id}
																			onClick={e => handleEventClick(event, e)}
																			event={event}
																			view='month'
																			isFirstDay={isFirstDay}
																			isLastDay={isLastDay}
																		/>
																	)
																})}
															</div>
														</div>
													</PopoverContent>
												</Popover>
											)}
										</div>
									</DroppableCell>
								</div>
							)
						})}
					</div>
				))}
			</div>
		</div>
	)
}
