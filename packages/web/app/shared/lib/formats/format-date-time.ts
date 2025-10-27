import { format } from 'date-fns'

/**
 * Format date-time value to user-friendly label (e.g., "Jan 15, 2024 3:45 PM")
 */
export function formatDateTimeLabel(value?: string): string {
	if (!value) {
		return 'Unknown date'
	}

	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return value
	}

	try {
		return format(date, 'PP p')
	} catch {
		return date.toISOString()
	}
}
