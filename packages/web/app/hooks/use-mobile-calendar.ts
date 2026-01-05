import type { CalendarApi } from '@fullcalendar/core'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useIsMobile } from '~/hooks/use-mobile.ts'

const MOBILE_CALENDAR_VIEW = 'timeGridDay'
const DESKTOP_CALENDAR_VIEW = 'timeGridWeek'

export interface UseMobileCalendarOptions {
	/**
	 * Reference to FullCalendar API for programmatic view changes
	 */
	calendarApi: CalendarApi | undefined

	/**
	 * Callback when view changes between mobile and desktop
	 */
	onViewChange?: (view: 'mobile' | 'desktop') => void
}

export interface UseMobileCalendarResult {
	/**
	 * Whether the current device is mobile
	 */
	isMobile: boolean

	/**
	 * The current calendar view name (timeGridDay or timeGridWeek)
	 */
	currentView: 'timeGridDay' | 'timeGridWeek'

	/**
	 * Navigate to the previous day (mobile) or week (desktop)
	 */
	navigatePrev: () => void

	/**
	 * Navigate to the next day (mobile) or week (desktop)
	 */
	navigateNext: () => void

	/**
	 * Navigate to today
	 */
	navigateToday: () => void

	/**
	 * Get the current date displayed
	 */
	currentDate: Date | undefined
}

/**
 * Hook for managing mobile-responsive calendar behavior.
 *
 * On mobile devices (< 768px):
 * - Shows single day view (timeGridDay)
 * - Provides day-by-day navigation
 *
 * On desktop:
 * - Shows week view (timeGridWeek)
 * - Provides week-by-week navigation
 */
export function useMobileCalendar(options: UseMobileCalendarOptions): UseMobileCalendarResult {
	const { calendarApi, onViewChange } = options
	const isMobile = useIsMobile()

	const [currentDate, setCurrentDate] = useState<Date | undefined>(undefined)

	// Determine the appropriate view based on screen size
	const currentView = useMemo(() => {
		return isMobile ? MOBILE_CALENDAR_VIEW : DESKTOP_CALENDAR_VIEW
	}, [isMobile])

	// Switch calendar view when screen size changes
	useEffect(() => {
		if (calendarApi === undefined) {
			return
		}

		const targetView = isMobile ? MOBILE_CALENDAR_VIEW : DESKTOP_CALENDAR_VIEW
		const currentCalendarView = calendarApi.view.type

		if (currentCalendarView !== targetView) {
			calendarApi.changeView(targetView)
			onViewChange?.(isMobile ? 'mobile' : 'desktop')
		}
	}, [calendarApi, isMobile, onViewChange])

	// Update current date when calendar changes
	useEffect(() => {
		if (calendarApi === undefined) {
			return
		}

		setCurrentDate(calendarApi.getDate())
	}, [calendarApi])

	const navigatePrev = useCallback(() => {
		if (calendarApi === undefined) {
			return
		}
		calendarApi.prev()
		setCurrentDate(calendarApi.getDate())
	}, [calendarApi])

	const navigateNext = useCallback(() => {
		if (calendarApi === undefined) {
			return
		}
		calendarApi.next()
		setCurrentDate(calendarApi.getDate())
	}, [calendarApi])

	const navigateToday = useCallback(() => {
		if (calendarApi === undefined) {
			return
		}
		calendarApi.today()
		setCurrentDate(calendarApi.getDate())
	}, [calendarApi])

	return {
		isMobile,
		currentView,
		navigatePrev,
		navigateNext,
		navigateToday,
		currentDate
	}
}
