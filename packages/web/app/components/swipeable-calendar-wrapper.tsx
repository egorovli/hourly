import type { ReactNode } from 'react'

export interface SwipeableCalendarWrapperProps {
	children: ReactNode
	enabled: boolean
	className?: string
}

/**
 * Wrapper component for the calendar that ensures proper touch handling.
 * Horizontal swipe navigation is disabled to prevent conflicts with calendar's
 * event dragging/selection. Use toolbar buttons for day navigation instead.
 */
export function SwipeableCalendarWrapper(props: SwipeableCalendarWrapperProps): ReactNode {
	const { children, className = '' } = props

	return (
		<div
			className={`relative overflow-hidden ${className}`}
			style={{ touchAction: 'pan-y' }}
		>
			{children}
		</div>
	)
}
