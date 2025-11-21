import type { CalendarEvent, EventColor } from './types.ts'

export { cn } from '~/lib/util/index.ts'

/**
 * Get CSS classes for event colors
 */
export function getEventColorClasses(color?: EventColor | string): string {
	const eventColor = color || 'sky'

	switch (eventColor) {
		case 'sky':
			return 'bg-sky-200/50 hover:bg-sky-200/40 text-sky-950/80 dark:bg-sky-400/25 dark:hover:bg-sky-400/20 dark:text-sky-200 shadow-sky-700/8'
		case 'amber':
			return 'bg-amber-200/50 hover:bg-amber-200/40 text-amber-950/80 dark:bg-amber-400/25 dark:hover:bg-amber-400/20 dark:text-amber-200 shadow-amber-700/8'
		case 'violet':
			return 'bg-violet-200/50 hover:bg-violet-200/40 text-violet-950/80 dark:bg-violet-400/25 dark:hover:bg-violet-400/20 dark:text-violet-200 shadow-violet-700/8'
		case 'rose':
			return 'bg-rose-200/50 hover:bg-rose-200/40 text-rose-950/80 dark:bg-rose-400/25 dark:hover:bg-rose-400/20 dark:text-rose-200 shadow-rose-700/8'
		case 'emerald':
			return 'bg-emerald-200/50 hover:bg-emerald-200/40 text-emerald-950/80 dark:bg-emerald-400/25 dark:hover:bg-emerald-400/20 dark:text-emerald-200 shadow-emerald-700/8'
		case 'orange':
			return 'bg-orange-200/50 hover:bg-orange-200/40 text-orange-950/80 dark:bg-orange-400/25 dark:hover:bg-orange-400/20 dark:text-orange-200 shadow-orange-700/8'
		default:
			return 'bg-sky-200/50 hover:bg-sky-200/40 text-sky-950/80 dark:bg-sky-400/25 dark:hover:bg-sky-400/20 dark:text-sky-200 shadow-sky-700/8'
	}
}

/**
 * Get CSS classes for border radius based on event position in multi-day events
 */
export function getBorderRadiusClasses(isFirstDay: boolean, isLastDay: boolean): string {
	if (isFirstDay && isLastDay) {
		return 'rounded' // Both ends rounded
	}
	if (isFirstDay) {
		return 'rounded-l rounded-r-none' // Only left end rounded
	}
	if (isLastDay) {
		return 'rounded-r rounded-l-none' // Only right end rounded
	}
	return 'rounded-none' // No rounded corners
}

/**
 * Check if an event is a multi-day event
 */
export function isMultiDayEvent(event: CalendarEvent): boolean {
	const eventStart = new Date(event.start)
	const eventEnd = new Date(event.end)
	return event.allDay || eventStart.getDate() !== eventEnd.getDate()
}

/**
 * Add hours to a date
 */
export function addHoursToDate(date: Date, hours: number): Date {
	const result = new Date(date)
	result.setHours(result.getHours() + hours)
	return result
}
