import type { Preferences } from '~/domain/preferences.ts'

/**
 * Get browser locale from navigator or Intl API
 */
export function getBrowserLocale(): string {
	if (typeof window === 'undefined') {
		return 'en'
	}

	try {
		// Try Intl first (more reliable)
		const locale = Intl.DateTimeFormat().resolvedOptions().locale
		return locale.split('-')[0] ?? 'en'
	} catch {
		// Fallback to navigator
		const navLocale = navigator.language ?? navigator.languages?.[0]
		return navLocale?.split('-')[0] ?? 'en'
	}
}

/**
 * Get browser timezone from Intl API
 */
export function getBrowserTimezone(): string {
	if (typeof window === 'undefined') {
		return 'UTC'
	}

	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone
	} catch {
		return 'UTC'
	}
}

/**
 * Get default weekStartsOn based on browser locale
 */
export function getDefaultWeekStartsOn(locale: string): number {
	try {
		// Try to use Intl for locale-aware week start
		const localeInfo = new Intl.Locale(locale)

		// Check if locale is US-based
		if (localeInfo.region === 'US') {
			// US typically uses Sunday (0), but we'll default to Monday (1) for consistency
			// Users can override in settings
			return 1
		}

		// For most other locales, Monday (1) is standard
		return 1
	} catch {
		return 1
	}
}

/**
 * Get default preferences based on browser locale and timezone
 * Client-side version that uses browser APIs
 */
export function getDefaultPreferences(): Partial<Preferences> {
	const locale = getBrowserLocale()
	const timezone = getBrowserTimezone()
	const weekStartsOn = getDefaultWeekStartsOn(locale)

	return {
		locale,
		timezone,
		weekStartsOn,
		workingDayStartTime: '09:00',
		workingDayEndTime: '18:00',
		minimumDurationMinutes: 60,
		calendarCompactMode: 'standard'
	}
}

/**
 * Merge preferences with defaults, ensuring defaults are applied when preferences are missing
 */
export function mergePreferencesWithDefaults(
	preferences: Partial<Preferences>
): Partial<Preferences> {
	const defaults = getDefaultPreferences()

	return {
		...defaults,
		...preferences
	}
}
