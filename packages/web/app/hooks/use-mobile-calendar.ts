import type { CalendarApi } from '@fullcalendar/core'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useIsMobile } from '~/hooks/use-mobile.ts'

const MOBILE_CALENDAR_VIEW = 'timeGridDay'
const DESKTOP_CALENDAR_VIEW = 'timeGridWeek'

/**
 * Mobile-optimized long press delay (ms).
 * Faster than default 1000ms but slow enough to avoid accidental triggers.
 */
const MOBILE_LONG_PRESS_DELAY = 300

/**
 * Desktop long press delay (ms).
 * Slightly faster for mouse users.
 */
const DESKTOP_LONG_PRESS_DELAY = 150

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

export interface MobileCalendarOptions {
	/**
	 * The initial view to use based on device
	 */
	initialView: 'timeGridDay' | 'timeGridWeek'

	/**
	 * Whether date selection is enabled
	 */
	selectable: boolean

	/**
	 * Show mirror element during selection
	 */
	selectMirror: boolean

	/**
	 * Delay before selection starts on touch devices (ms)
	 */
	selectLongPressDelay: number

	/**
	 * Delay before event drag starts on touch devices (ms)
	 */
	eventLongPressDelay: number

	/**
	 * Delay before long press triggers on touch devices (ms)
	 */
	longPressDelay: number
}

export type SwipeDirection = 'left' | 'right' | undefined

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

	/**
	 * FullCalendar options optimized for the current device
	 */
	calendarOptions: MobileCalendarOptions

	/**
	 * Current swipe direction for animation purposes
	 */
	swipeDirection: SwipeDirection

	/**
	 * Set the swipe direction (used by SwipeableCalendarWrapper)
	 */
	setSwipeDirection: (direction: SwipeDirection) => void

	/**
	 * Whether a swipe animation is in progress
	 */
	isAnimating: boolean

	/**
	 * Set animation state
	 */
	setIsAnimating: (animating: boolean) => void

	/**
	 * Format the current date for display
	 */
	formattedDate: string
}

/**
 * Hook for managing mobile-responsive calendar behavior.
 *
 * On mobile devices (< 768px):
 * - Shows single day view (timeGridDay)
 * - Provides day-by-day navigation
 * - Enables touch-optimized selection with long press
 *
 * On desktop:
 * - Shows week view (timeGridWeek)
 * - Provides week-by-week navigation
 * - Enables click-based selection
 */
export function useMobileCalendar(options: UseMobileCalendarOptions): UseMobileCalendarResult {
	const { calendarApi, onViewChange } = options
	const isMobile = useIsMobile()

	const [currentDate, setCurrentDate] = useState<Date | undefined>(undefined)
	const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>(undefined)
	const [isAnimating, setIsAnimating] = useState(false)

	// Determine the appropriate view based on screen size
	const currentView = useMemo(() => {
		return isMobile ? MOBILE_CALENDAR_VIEW : DESKTOP_CALENDAR_VIEW
	}, [isMobile])

	// Calendar options optimized for the current device
	const calendarOptions = useMemo<MobileCalendarOptions>(() => {
		const longPressDelay = isMobile ? MOBILE_LONG_PRESS_DELAY : DESKTOP_LONG_PRESS_DELAY

		return {
			initialView: isMobile ? MOBILE_CALENDAR_VIEW : DESKTOP_CALENDAR_VIEW,
			selectable: true,
			selectMirror: true,
			selectLongPressDelay: longPressDelay,
			eventLongPressDelay: longPressDelay,
			longPressDelay
		}
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
		if (calendarApi === undefined || isAnimating) {
			return
		}
		setSwipeDirection('right')
		calendarApi.prev()
		setCurrentDate(calendarApi.getDate())
	}, [calendarApi, isAnimating])

	const navigateNext = useCallback(() => {
		if (calendarApi === undefined || isAnimating) {
			return
		}
		setSwipeDirection('left')
		calendarApi.next()
		setCurrentDate(calendarApi.getDate())
	}, [calendarApi, isAnimating])

	const navigateToday = useCallback(() => {
		if (calendarApi === undefined || isAnimating) {
			return
		}
		calendarApi.today()
		setCurrentDate(calendarApi.getDate())
		setSwipeDirection(undefined)
	}, [calendarApi, isAnimating])

	// Format current date for display
	const formattedDate = useMemo(() => {
		if (currentDate === undefined) {
			return ''
		}

		if (isMobile) {
			// Mobile: Show day and date, e.g., "Mon, Jan 6"
			return currentDate.toLocaleDateString('en-US', {
				weekday: 'short',
				month: 'short',
				day: 'numeric'
			})
		}

		// Desktop: Show week range, e.g., "Jan 6 – 12, 2025"
		const weekEnd = new Date(currentDate)
		weekEnd.setDate(weekEnd.getDate() + 6)

		const startMonth = currentDate.toLocaleDateString('en-US', { month: 'short' })
		const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' })
		const startDay = currentDate.getDate()
		const endDay = weekEnd.getDate()
		const year = weekEnd.getFullYear()

		if (startMonth === endMonth) {
			return `${startMonth} ${startDay} – ${endDay}, ${year}`
		}

		return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`
	}, [currentDate, isMobile])

	return {
		isMobile,
		currentView,
		navigatePrev,
		navigateNext,
		navigateToday,
		currentDate,
		calendarOptions,
		swipeDirection,
		setSwipeDirection,
		isAnimating,
		setIsAnimating,
		formattedDate
	}
}
