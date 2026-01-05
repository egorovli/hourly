import type { ReactNode } from 'react'
import type { SwipeDirection } from '~/hooks/use-mobile-calendar.ts'

import { useCallback, useRef } from 'react'
import { ChevronRightIcon } from 'lucide-react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'

const SWIPE_THRESHOLD = 80
const VELOCITY_THRESHOLD = 500
const MAX_DRAG_FRACTION = 0.4

export interface SwipeableCalendarWrapperProps {
	children: ReactNode
	enabled: boolean
	onSwipePrev: () => void
	onSwipeNext: () => void
	swipeDirection: SwipeDirection
	onSwipeDirectionChange: (direction: SwipeDirection) => void
	isAnimating: boolean
	onAnimatingChange: (animating: boolean) => void
	className?: string
}

/**
 * Wrapper component that enables swipe gestures for calendar navigation.
 * Supports horizontal swipe with spring-based animations and threshold-based activation.
 */
export function SwipeableCalendarWrapper(props: SwipeableCalendarWrapperProps): ReactNode {
	const {
		children,
		enabled,
		onSwipePrev,
		onSwipeNext,
		swipeDirection,
		onSwipeDirectionChange,
		onAnimatingChange,
		className = ''
	} = props

	const containerRef = useRef<HTMLDivElement>(null)
	const x = useMotionValue(0)

	const opacity = useTransform(x, [-200, 0, 200], [0.7, 1, 0.7])
	const scale = useTransform(x, [-200, 0, 200], [0.98, 1, 0.98])

	const handleDragEnd = useCallback(
		(
			_event: MouseEvent | TouchEvent | PointerEvent,
			info: { offset: { x: number }; velocity: { x: number } }
		) => {
			const { offset, velocity } = info
			const containerWidth = containerRef.current?.offsetWidth ?? 400

			const swipedLeft = offset.x < -SWIPE_THRESHOLD || velocity.x < -VELOCITY_THRESHOLD
			const swipedRight = offset.x > SWIPE_THRESHOLD || velocity.x > VELOCITY_THRESHOLD

			if (swipedLeft) {
				onSwipeDirectionChange('left')
				onAnimatingChange(true)

				animate(x, -containerWidth * 0.5, {
					type: 'spring',
					stiffness: 300,
					damping: 30,
					onComplete: () => {
						onSwipeNext()
						x.set(0)
						onAnimatingChange(false)
						onSwipeDirectionChange(undefined)
					}
				})
			} else if (swipedRight) {
				onSwipeDirectionChange('right')
				onAnimatingChange(true)

				animate(x, containerWidth * 0.5, {
					type: 'spring',
					stiffness: 300,
					damping: 30,
					onComplete: () => {
						onSwipePrev()
						x.set(0)
						onAnimatingChange(false)
						onSwipeDirectionChange(undefined)
					}
				})
			} else {
				animate(x, 0, {
					type: 'spring',
					stiffness: 400,
					damping: 30
				})
			}
		},
		[x, onSwipePrev, onSwipeNext, onSwipeDirectionChange, onAnimatingChange]
	)

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
				<ChevronRightIcon className={`size-5 ${isLeft ? '' : 'rotate-180'}`} />
			</div>
		</motion.div>
	)
}
