import { DateTime } from 'luxon'

export const SYSTEM_TIMEZONE_VALUE = 'system'

/**
 * Returns the timezone value to pass to FullCalendar.
 * 'system' preference maps to 'local' (browser's timezone).
 * Any other value is passed through as-is (IANA timezone name).
 */
export function getTimezoneForCalendar(preference: string | undefined): string {
	if (!preference || preference === SYSTEM_TIMEZONE_VALUE) {
		return 'local'
	}
	return preference
}

/**
 * Returns the timezone abbreviation for display (e.g., "EST", "PST", "UTC").
 * For 'system' preference, returns undefined (to show "System" label instead).
 */
export function getTimezoneAbbreviation(timezone: string | undefined): string | undefined {
	if (!timezone || timezone === SYSTEM_TIMEZONE_VALUE || timezone === 'local') {
		return undefined
	}

	try {
		const dt = DateTime.now().setZone(timezone)
		if (!dt.isValid) {
			return undefined
		}
		return dt.toFormat('ZZZZ')
	} catch {
		return undefined
	}
}

/**
 * Validates that a timezone string is either 'system' or a valid IANA timezone.
 */
export function isValidTimezone(timezone: string | undefined): boolean {
	if (!timezone) {
		return false
	}

	if (timezone === SYSTEM_TIMEZONE_VALUE) {
		return true
	}

	try {
		const dt = DateTime.now().setZone(timezone)
		return dt.isValid
	} catch {
		return false
	}
}

/**
 * Detects the browser's timezone using Intl API.
 * Returns undefined if detection fails.
 */
export function detectSystemTimezone(): string | undefined {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone
	} catch {
		return undefined
	}
}

/**
 * Converts a date string to UTC ISO format for FullCalendar.
 * FullCalendar handles UTC dates correctly in all timezone modes.
 *
 * FullCalendar documentation recommends UTC for named timezones:
 * > When parsing ISO8601 strings that have time zone offsets, the offset will essentially be ignored!
 *
 * By converting "10:00:00+01:00" → "09:00:00Z" (UTC), FullCalendar correctly displays:
 * - In Paris (UTC+1): 09:00 UTC = 10:00 local ✓
 * - In Warsaw (UTC+1): 09:00 UTC = 10:00 local ✓
 * - In GMT+3: 09:00 UTC = 12:00 local ✓
 */
export function toUtcIsoString(dateString: string): string {
	const dt = DateTime.fromISO(dateString, { setZone: true })
	if (!dt.isValid) {
		return dateString
	}
	return dt.toUTC().toISO() ?? dateString
}
