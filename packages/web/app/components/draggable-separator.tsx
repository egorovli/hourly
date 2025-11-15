import { useCallback, useRef } from 'react'

import { GripVertical } from 'lucide-react'

interface DraggableSeparatorProps {
	onDrag: (offsetX: number) => void
	orientation?: 'vertical' | 'horizontal'
	className?: string
}

export function DraggableSeparator({
	onDrag,
	orientation = 'vertical',
	className = ''
}: DraggableSeparatorProps) {
	const isDraggingRef = useRef(false)
	const startXRef = useRef(0)
	const currentXRef = useRef(0)

	const handlePointerDown = useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			if (orientation !== 'vertical') {
				return
			}

			isDraggingRef.current = true
			startXRef.current = event.clientX
			currentXRef.current = event.clientX

			const handlePointerMove = (e: PointerEvent) => {
				if (!isDraggingRef.current) {
					return
				}

				const deltaX = e.clientX - currentXRef.current
				currentXRef.current = e.clientX
				onDrag(deltaX)
			}

			const handlePointerUp = () => {
				isDraggingRef.current = false
				document.removeEventListener('pointermove', handlePointerMove)
				document.removeEventListener('pointerup', handlePointerUp)
			}

			document.addEventListener('pointermove', handlePointerMove)
			document.addEventListener('pointerup', handlePointerUp)
		},
		[orientation, onDrag]
	)

	if (orientation === 'horizontal') {
		return (
			<div
				className={`group flex h-px w-full cursor-row-resize items-center justify-center bg-slate-200 transition-colors hover:bg-indigo-400 ${className}`}
				style={{ touchAction: 'none' }}
			>
				<GripVertical className='size-4 rotate-90 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100' />
			</div>
		)
	}

	return (
		<div
			className={`group relative flex w-px cursor-col-resize items-center justify-center bg-slate-200 transition-colors hover:bg-indigo-400 ${className}`}
			onPointerDown={handlePointerDown}
			style={{ touchAction: 'none' }}
		>
			<div className='absolute inset-y-0 -left-2 -right-2' />
			<GripVertical className='pointer-events-none size-4 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100' />
		</div>
	)
}
