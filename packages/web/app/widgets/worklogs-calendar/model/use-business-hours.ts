import { useMemo } from 'react'
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
		const base = calendarDate ?? new Date()
		const [startHourStr, startMinStr] = (workingDayStartTime ?? '09:00').split(':').map(Number)
		const [endHourStr, endMinStr] = (workingDayEndTime ?? '18:00').split(':').map(Number)
		const isInvalid =
			Number.isNaN(startHourStr) ||
			Number.isNaN(startMinStr) ||
			Number.isNaN(endHourStr) ||
			Number.isNaN(endMinStr)
		const defaultStart = new Date(base)
		defaultStart.setHours(8, 0, 0, 0)
		const defaultEnd = new Date(base)
		defaultEnd.setHours(18, 0, 0, 0)
		if (isInvalid) {
			return { start: defaultStart, end: defaultEnd }
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
				const eventStartMinutes = event.start.getHours() * 60 + event.start.getMinutes()
				const eventEndMinutes = event.end.getHours() * 60 + event.end.getMinutes()

				const defaultStartMinutes = minHour * 60 + minMinutes
				const defaultEndMinutes = maxHour * 60 + maxMinutes

				if (eventStartMinutes < defaultStartMinutes) {
					minHour = event.start.getHours()
					minMinutes = 0
				}

				if (eventEndMinutes > defaultEndMinutes) {
					maxHour = event.end.getHours()
					maxMinutes = 0
					if (event.end.getMinutes() > 0) {
						maxHour += 1
					}
				}
			}
		}

		const start = new Date(base)
		start.setHours(minHour, minMinutes, 0, 0)
		const end = new Date(base)
		end.setHours(maxHour, maxMinutes, 0, 0)

		return { start, end }
	}, [calendarDate, calendarEvents, viewDateRange, workingDayStartTime, workingDayEndTime])
}
