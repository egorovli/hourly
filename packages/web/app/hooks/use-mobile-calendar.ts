import type { CalendarApi } from '@fullcalendar/core'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useIsMobile } from '~/hooks/use-mobile.ts'

const MOBILE_CALENDAR_VIEW = 'timeGridDay'
const DESKTOP_CALENDAR_VIEW = 'timeGridWeek'
const MOBILE_LONG_PRESS_DELAY = 300
const DESKTOP_LONG_PRESS_DELAY = 150

export interface UseMobileCalendarOptions {
	calendarApi: CalendarApi | undefined
	onViewChange?: (view: 'mobile' | 'desktop') => void
}

/**
 * FullCalendar options optimized for mobile/desktop.
 * @see https://fullcalendar.io/docs
 */
export interface MobileCalendarOptions {
	initialView: 'timeGridDay' | 'timeGridWeek'
	selectable: boolean
	selectMirror: boolean
	selectLongPressDelay: number
	eventLongPressDelay: number
	longPressDelay: number
}

export type SwipeDirection = 'left' | 'right' | undefined

export interface UseMobileCalendarResult {
	isMobile: boolean
	currentView: 'timeGridDay' | 'timeGridWeek'
	navigatePrev: () => void
	navigateNext: () => void
	navigateToday: () => void
	currentDate: Date | undefined
	calendarOptions: MobileCalendarOptions
	swipeDirection: SwipeDirection
	setSwipeDirection: (direction: SwipeDirection) => void
	isAnimating: boolean
	setIsAnimating: (animating: boolean) => void
	formattedDate: string
}

/**
 * Hook for managing mobile-responsive calendar behavior.
 *
 * On mobile devices (< 768px): shows single day view with touch-optimized selection.
 * On desktop: shows week view with click-based selection.
 */
export function useMobileCalendar(options: UseMobileCalendarOptions): UseMobileCalendarResult {
	const { calendarApi, onViewChange } = options
	const isMobile = useIsMobile()

	const [currentDate, setCurrentDate] = useState<Date | undefined>(undefined)
	const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>(undefined)
	const [isAnimating, setIsAnimating] = useState(false)

	const currentView = useMemo(() => {
		return isMobile ? MOBILE_CALENDAR_VIEW : DESKTOP_CALENDAR_VIEW
	}, [isMobile])

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

	const formattedDate = useMemo(() => {
		if (currentDate === undefined) {
			return ''
		}

		if (isMobile) {
			return currentDate.toLocaleDateString('en-US', {
				weekday: 'short',
				month: 'short',
				day: 'numeric'
			})
		}

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
