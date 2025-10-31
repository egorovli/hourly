import { useMemo } from 'react'
import { DateTime } from 'luxon'
import type { WorklogCalendarEvent } from '~/entities/index.ts'

export function useBusinessHours({
	calendarDate,
	calendarEvents,
	viewDateRange,
	workingDayStartTime,
	workingDayEndTime
}: {
	calendarDate: Date
	calendarEvents: WorklogCalendarEvent[]
	viewDateRange?: { from: Date; to: Date }
	workingDayStartTime: string
	workingDayEndTime: string
}) {
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Derived time window with bounds and event scanning
	return useMemo(() => {
		const base = calendarDate ? DateTime.fromJSDate(calendarDate) : DateTime.now()
		const [startHourStr, startMinStr] = (workingDayStartTime ?? '09:00').split(':').map(Number)
		const [endHourStr, endMinStr] = (workingDayEndTime ?? '18:00').split(':').map(Number)
		const isInvalid =
			Number.isNaN(startHourStr) ||
			Number.isNaN(startMinStr) ||
			Number.isNaN(endHourStr) ||
			Number.isNaN(endMinStr)
		const defaultStart = base.startOf('day').set({ hour: 8, minute: 0, second: 0, millisecond: 0 })
		const defaultEnd = base.startOf('day').set({ hour: 18, minute: 0, second: 0, millisecond: 0 })
		if (isInvalid) {
			return { start: defaultStart.toJSDate(), end: defaultEnd.toJSDate() }
		}

		const startMinutes = (startHourStr ?? 9) * 60 + (startMinStr ?? 0) - 30
		const endMinutes = (endHourStr ?? 18) * 60 + (endMinStr ?? 0) + 30

		let minHour = Math.floor(Math.max(0, startMinutes) / 60)
		let minMinutes = Math.max(0, startMinutes) % 60
		let maxHour = Math.floor(Math.min(24 * 60, endMinutes) / 60)
		let maxMinutes = Math.min(24 * 60, endMinutes) % 60

		const visibleEvents =
			viewDateRange?.from && viewDateRange?.to
				? calendarEvents.filter(
						event =>
							viewDateRange.to &&
							viewDateRange.from &&
							event.start <= viewDateRange.to &&
							event.end >= viewDateRange.from
					)
				: calendarEvents

		if (visibleEvents.length > 0) {
			for (const event of visibleEvents) {
				const eventStartDt = DateTime.fromJSDate(event.start)
				const eventEndDt = DateTime.fromJSDate(event.end)
				const eventStartMinutes = eventStartDt.hour * 60 + eventStartDt.minute
				const eventEndMinutes = eventEndDt.hour * 60 + eventEndDt.minute

				const defaultStartMinutes = minHour * 60 + minMinutes
				const defaultEndMinutes = maxHour * 60 + maxMinutes

				if (eventStartMinutes < defaultStartMinutes) {
					minHour = eventStartDt.hour
					minMinutes = 0
				}

				if (eventEndMinutes > defaultEndMinutes) {
					maxHour = eventEndDt.hour
					maxMinutes = 0
					if (eventEndDt.minute > 0) {
						maxHour += 1
					}
				}
			}
		}

		const start = base
			.startOf('day')
			.set({ hour: minHour, minute: minMinutes, second: 0, millisecond: 0 })
		const end = base
			.startOf('day')
			.set({ hour: maxHour, minute: maxMinutes, second: 0, millisecond: 0 })

		return { start: start.toJSDate(), end: end.toJSDate() }
	}, [calendarDate, calendarEvents, viewDateRange, workingDayStartTime, workingDayEndTime])
}
