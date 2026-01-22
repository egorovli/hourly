import { useCallback, useEffect, useState } from 'react'

import { useFetcher } from 'react-router'

import {
	detectSystemTimezone,
	getTimezoneForCalendar,
	SYSTEM_TIMEZONE_VALUE
} from '~/lib/timezone/index.ts'

export interface UseTimezoneResult {
	/** The user's timezone preference ('system' or IANA timezone) */
	preference: string
	/** The effective timezone for FullCalendar ('local' or IANA timezone) */
	effectiveTimezone: string
	/** The detected system timezone (only available after client-side hydration) */
	detectedSystemTz: string | undefined
	/** Updates the timezone preference and persists to cookie */
	setTimezone: (timezone: string) => void
	/** Whether the preference is being saved */
	isPending: boolean
}

/**
 * Hook for managing timezone state and persistence.
 *
 * @param savedPreference - The timezone preference from the cookie (loaded in route loader)
 * @returns Timezone state and setter
 */
export function useTimezone(savedPreference: string | undefined): UseTimezoneResult {
	const fetcher = useFetcher()

	// Initialize with saved preference or system default
	const [preference, setPreference] = useState<string>(savedPreference ?? SYSTEM_TIMEZONE_VALUE)

	// Detect system timezone client-side
	const [detectedSystemTz, setDetectedSystemTz] = useState<string | undefined>(undefined)

	// Detect system timezone on mount
	useEffect(() => {
		setDetectedSystemTz(detectSystemTimezone())
	}, [])

	// Sync with saved preference when it changes (e.g., from loader)
	useEffect(() => {
		if (savedPreference) {
			setPreference(savedPreference)
		}
	}, [savedPreference])

	// Update preference and persist to cookie
	const setTimezone = useCallback(
		(timezone: string) => {
			setPreference(timezone)

			// Persist to cookie via fetcher
			fetcher.submit({ timezone }, { method: 'POST', action: '/preferences' })
		},
		[fetcher]
	)

	return {
		preference,
		effectiveTimezone: getTimezoneForCalendar(preference),
		detectedSystemTz,
		setTimezone,
		isPending: fetcher.state !== 'idle'
	}
}
