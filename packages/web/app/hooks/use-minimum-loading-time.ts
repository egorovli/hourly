import { useEffect, useRef, useState } from 'react'

/**
 * Ensures a minimum loading time to prevent flashing of loading states.
 * If the actual loading completes faster than the minimum time, this hook
 * will artificially extend the loading state.
 *
 * @param isLoading - Whether the actual loading is in progress
 * @param minimumMs - Minimum time in milliseconds to show loading state (default: 300ms)
 * @returns Whether to show the loading state (respects minimum time)
 */
export function useMinimumLoadingTime(isLoading: boolean, minimumMs = 300): boolean {
	const [showLoading, setShowLoading] = useState(isLoading)
	const [startTime, setStartTime] = useState<number | undefined>(undefined)
	const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

	useEffect(() => {
		// Clear any pending timeout when effect runs
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current)
			timeoutRef.current = undefined
		}

		if (isLoading) {
			// Start loading
			const start = Date.now()
			setStartTime(start)
			setShowLoading(true)
		} else if (startTime !== undefined) {
			// Loading completed - check if we need to extend
			const elapsed = Date.now() - startTime
			const remaining = Math.max(0, minimumMs - elapsed)

			if (remaining > 0) {
				// Extend loading state
				timeoutRef.current = setTimeout(() => {
					setShowLoading(false)
					setStartTime(undefined)
					timeoutRef.current = undefined
				}, remaining)
			} else {
				// Already exceeded minimum time, hide immediately
				setShowLoading(false)
				setStartTime(undefined)
			}
		}

		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
				timeoutRef.current = undefined
			}
		}
	}, [isLoading, minimumMs, startTime])

	return showLoading
}
