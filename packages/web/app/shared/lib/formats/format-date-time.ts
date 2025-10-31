import { DateTime } from 'luxon'

/**
 * Format date-time value to user-friendly label (e.g., "Jan 15, 2024 3:45 PM")
 * @param value - ISO date string
 * @param timezone - Optional IANA timezone string (e.g., "Europe/Moscow", "UTC")
 */
export function formatDateTimeLabel(value?: string, timezone?: string): string {
	if (!value) {
		return 'Unknown date'
	}

	const dt = DateTime.fromISO(value, { zone: timezone ?? 'local' })
	if (!dt.isValid) {
		return value
	}

	try {
		// Use Luxon's locale-aware formatting similar to date-fns PP p format
		// PP p = "Apr 20, 2017 11:32 AM"
		return dt.toLocaleString(DateTime.DATETIME_MED)
	} catch {
		return dt.toISO() ?? 'Invalid date'
	}
}

/**
 * Format date-time value with timezone support
 * @param value - ISO date string or Date object
 * @param timezone - IANA timezone string (e.g., "Europe/Moscow", "UTC")
 * @param options - Intl.DateTimeFormatOptions for formatting
 */
export function formatDateTimeWithTimezone(
	value: string | Date,
	timezone: string,
	options?: Intl.DateTimeFormatOptions
): string {
	if (!value) {
		return 'Unknown date'
	}

	const dt =
		typeof value === 'string'
			? DateTime.fromISO(value, { zone: timezone })
			: DateTime.fromJSDate(value, { zone: timezone })

	if (!dt.isValid) {
		return typeof value === 'string' ? value : 'Invalid date'
	}

	try {
		const defaultOptions: Intl.DateTimeFormatOptions = {
			dateStyle: 'medium',
			timeStyle: 'short',
			...options
		}

		return dt.toLocaleString(defaultOptions)
	} catch {
		// Fallback to ISO string if timezone formatting fails
		return dt.toISO() ?? 'Invalid date'
	}
}
