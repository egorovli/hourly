import type { ReactNode } from 'react'

import { createContext, useContext, useEffect, useState } from 'react'

interface DragContextValue {
	isDragging: boolean
	setIsDragging: (dragging: boolean) => void
}

const DragContext = createContext<DragContextValue | undefined>(undefined)

export function DragProvider({ children }: { children: ReactNode }) {
	const [isDragging, setIsDragging] = useState(false)

	// Add/remove class to body to prevent text selection
	useEffect(() => {
		if (isDragging) {
			document.body.classList.add('is-dragging')
		} else {
			document.body.classList.remove('is-dragging')
		}

		return () => {
			document.body.classList.remove('is-dragging')
		}
	}, [isDragging])

	return (
		<DragContext.Provider value={{ isDragging, setIsDragging }}>{children}</DragContext.Provider>
	)
}

export function useDrag() {
	const context = useContext(DragContext)
	if (context === undefined) {
		throw new Error('useDrag must be used within a DragProvider')
	}
	return context
}
