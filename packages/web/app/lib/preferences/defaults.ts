import type { Preferences } from '~/domain/preferences.ts'

/**
 * Detect browser locale from Accept-Language header or fallback to 'en'
 */
export function detectLocaleFromHeader(acceptLanguage?: string | null): string {
	if (!acceptLanguage) {
		return 'en'
	}

	// Parse Accept-Language header (e.g., "en-US,en;q=0.9,ru;q=0.8")
	const languages = acceptLanguage
		.split(',')
		.map(lang => {
			const [code, q = 'q=1'] = lang.trim().split(';')
			if (!code) {
				return null
			}
			const quality = Number.parseFloat(q.replace('q=', ''))
			return { code: code.trim().toLowerCase(), quality }
		})
		.filter((item): item is { code: string; quality: number } => item !== null)
		.sort((a, b) => b.quality - a.quality)

	// Return first language code (without region if present)
	if (languages.length > 0 && languages[0]) {
		const firstLang = languages[0].code.split('-')[0]
		return firstLang ?? 'en'
	}

	return 'en'
}

/**
 * Detect timezone from request headers or fallback to system default
 * Note: Browsers don't send timezone in headers by default, so we'll use
 * a client-side approach or fallback to UTC offset detection
 */
export function detectTimezoneFromHeader(): string {
	// On server, we can't reliably detect timezone from headers
	// Return a default that will be overridden on client if needed
	// This is a fallback - client should use Intl.DateTimeFormat().resolvedOptions().timeZone
	return 'UTC'
}

/**
 * Get default weekStartsOn based on locale
 * Uses Intl.Locale to determine first day of week for a locale
 */
export function getDefaultWeekStartsOn(locale: string): number {
	try {
		// Try to use Intl for locale-aware week start
		// Monday = 1, Sunday = 0
		// Most locales use Monday (1) as first day, but US uses Sunday (0)
		const localeInfo = new Intl.Locale(locale)

		// Check if locale is US-based (US, en-US, etc.)
		if (
			localeInfo.region === 'US' ||
			(localeInfo.language === 'en' && localeInfo.region === undefined)
		) {
			// For US locales, check if we can detect preference
			// Default US to Sunday (0), but many apps use Monday (1)
			// We'll default to Monday (1) as it's more common globally
			return 1
		}

		// For most other locales, Monday (1) is standard
		return 1
	} catch {
		// Fallback to Monday (1) if locale parsing fails
		return 1
	}
}

/**
 * Get default working hours based on locale/culture
 * These are reasonable defaults that can be overridden
 */
export function getDefaultWorkingHours(): { start: string; end: string } {
	return {
		start: '09:00',
		end: '18:00'
	}
}

/**
 * Get default preferences based on browser locale and timezone
 * This provides a single source of truth for all preference defaults
 */
export function getDefaultPreferences(request?: {
	headers?: {
		get?: (name: string) => string | null
	}
}): Partial<Preferences> {
	const acceptLanguage = request?.headers?.get?.('Accept-Language')
	const locale = detectLocaleFromHeader(acceptLanguage)
	const timezone = detectTimezoneFromHeader()
	const weekStartsOn = getDefaultWeekStartsOn(locale)
	const workingHours = getDefaultWorkingHours()

	return {
		locale,
		timezone,
		weekStartsOn,
		workingDayStartTime: workingHours.start,
		workingDayEndTime: workingHours.end,
		minimumDurationMinutes: 60,
		calendarCompactMode: 'standard'
	}
}

/**
 * Merge preferences with defaults, ensuring defaults are applied when preferences are missing
 */
export function mergePreferencesWithDefaults(
	preferences: Partial<Preferences>,
	request?: {
		headers?: {
			get?: (name: string) => string | null
		}
	}
): Partial<Preferences> {
	const defaults = getDefaultPreferences(request)

	return {
		...defaults,
		...preferences
	}
}
