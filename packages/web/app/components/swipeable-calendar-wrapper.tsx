import type { ReactNode } from 'react'
import type { SwipeDirection } from '~/hooks/use-mobile-calendar.ts'

import { useCallback, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'motion/react'

/**
 * Minimum swipe distance (in pixels) to trigger navigation.
 * This is roughly 25% of typical mobile screen width.
 */
const SWIPE_THRESHOLD = 80

/**
 * Velocity threshold (px/s) for quick swipes to trigger navigation
 * even if distance threshold isn't met.
 */
const VELOCITY_THRESHOLD = 500

/**
 * Maximum drag distance as a fraction of container width.
 * Prevents dragging too far off screen.
 */
const MAX_DRAG_FRACTION = 0.4

export interface SwipeableCalendarWrapperProps {
	/**
	 * The calendar component to wrap
	 */
	children: ReactNode

	/**
	 * Whether swipe navigation is enabled (typically only on mobile)
	 */
	enabled: boolean

	/**
	 * Callback when swiping to the previous day/week
	 */
	onSwipePrev: () => void

	/**
	 * Callback when swiping to the next day/week
	 */
	onSwipeNext: () => void

	/**
	 * Current swipe direction for animation coordination
	 */
	swipeDirection: SwipeDirection

	/**
	 * Callback to set swipe direction
	 */
	onSwipeDirectionChange: (direction: SwipeDirection) => void

	/**
	 * Whether an animation is in progress
	 */
	isAnimating: boolean

	/**
	 * Callback to set animation state
	 */
	onAnimatingChange: (animating: boolean) => void

	/**
	 * Additional class name for the wrapper
	 */
	className?: string
}

/**
 * Wrapper component that enables swipe gestures for calendar navigation.
 *
 * Features:
 * - Horizontal swipe to navigate between days (mobile) or weeks (desktop)
 * - Spring-based animation for smooth transitions
 * - Visual feedback during drag with opacity and scale changes
 * - Threshold-based activation to prevent accidental navigation
 * - Quick velocity swipes for responsive feel
 */
export function SwipeableCalendarWrapper(props: SwipeableCalendarWrapperProps): ReactNode {
	const {
		children,
		enabled,
		onSwipePrev,
		onSwipeNext,
		swipeDirection,
		onSwipeDirectionChange,
		isAnimating,
		onAnimatingChange,
		className = ''
	} = props

	const containerRef = useRef<HTMLDivElement>(null)
	const x = useMotionValue(0)

	// Transform x position to opacity (slight fade during drag)
	const opacity = useTransform(x, [-200, 0, 200], [0.7, 1, 0.7])

	// Transform x position to scale (slight scale during drag)
	const scale = useTransform(x, [-200, 0, 200], [0.98, 1, 0.98])

	const handleDragEnd = useCallback(
		(
			_event: MouseEvent | TouchEvent | PointerEvent,
			info: { offset: { x: number }; velocity: { x: number } }
		) => {
			const { offset, velocity } = info
			const containerWidth = containerRef.current?.offsetWidth ?? 400

			// Check if swipe threshold is met (distance or velocity)
			const swipedLeft = offset.x < -SWIPE_THRESHOLD || velocity.x < -VELOCITY_THRESHOLD
			const swipedRight = offset.x > SWIPE_THRESHOLD || velocity.x > VELOCITY_THRESHOLD

			if (swipedLeft) {
				// Swiped left = go to next
				onSwipeDirectionChange('left')
				onAnimatingChange(true)

				// Animate out to the left, then navigate and reset
				animate(x, -containerWidth * 0.5, {
					type: 'spring',
					stiffness: 300,
					damping: 30,
					onComplete: () => {
						onSwipeNext()
						// Quick reset without animation
						x.set(0)
						onAnimatingChange(false)
						onSwipeDirectionChange(undefined)
					}
				})
			} else if (swipedRight) {
				// Swiped right = go to previous
				onSwipeDirectionChange('right')
				onAnimatingChange(true)

				// Animate out to the right, then navigate and reset
				animate(x, containerWidth * 0.5, {
					type: 'spring',
					stiffness: 300,
					damping: 30,
					onComplete: () => {
						onSwipePrev()
						// Quick reset without animation
						x.set(0)
						onAnimatingChange(false)
						onSwipeDirectionChange(undefined)
					}
				})
			} else {
				// Didn't meet threshold, snap back to center
				animate(x, 0, {
					type: 'spring',
					stiffness: 400,
					damping: 30
				})
			}
		},
		[x, onSwipePrev, onSwipeNext, onSwipeDirectionChange, onAnimatingChange]
	)

	// If not enabled, just render children without wrapper
	if (!enabled) {
		return <div className={className}>{children}</div>
	}

	const containerWidth = containerRef.current?.offsetWidth ?? 400
	const maxDrag = containerWidth * MAX_DRAG_FRACTION

	return (
		<div
			ref={containerRef}
			className={`relative overflow-hidden ${className}`}
			style={{ touchAction: 'pan-y' }}
		>
			<motion.div
				drag='x'
				dragConstraints={{ left: -maxDrag, right: maxDrag }}
				dragElastic={0.2}
				dragMomentum={false}
				onDragEnd={handleDragEnd}
				style={{
					x,
					opacity,
					scale,
					touchAction: 'pan-y'
				}}
				className='h-full w-full'
			>
				{children}
			</motion.div>

			{/* Visual swipe indicators */}
			<SwipeIndicator
				direction='left'
				active={swipeDirection === 'left'}
			/>
			<SwipeIndicator
				direction='right'
				active={swipeDirection === 'right'}
			/>
		</div>
	)
}

interface SwipeIndicatorProps {
	direction: 'left' | 'right'
	active: boolean
}

/**
 * Visual indicator that appears during swipe gestures.
 */
function SwipeIndicator({ direction, active }: SwipeIndicatorProps): ReactNode {
	const isLeft = direction === 'left'

	return (
		<motion.div
			className={`pointer-events-none absolute top-1/2 ${isLeft ? 'right-2' : 'left-2'} -translate-y-1/2`}
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{
				opacity: active ? 0.6 : 0,
				scale: active ? 1 : 0.8
			}}
			transition={{ duration: 0.15 }}
		>
			<div className='flex size-10 items-center justify-center rounded-full bg-primary/20 text-primary backdrop-blur-sm'>
				<svg
					className={`size-5 ${isLeft ? '' : 'rotate-180'}`}
					fill='none'
					viewBox='0 0 24 24'
					stroke='currentColor'
					strokeWidth={2}
				>
					<path
						strokeLinecap='round'
						strokeLinejoin='round'
						d='M9 5l7 7-7 7'
					/>
				</svg>
			</div>
		</motion.div>
	)
}
