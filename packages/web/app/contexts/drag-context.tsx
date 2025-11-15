import type { ReactNode } from 'react'

import { createContext, useContext, useMemo, useState } from 'react'

interface DragContextValue {
	isDragging: boolean
	setIsDragging: (dragging: boolean) => void
}

const DragContext = createContext<DragContextValue | undefined>(undefined)

export function DragProvider({ children }: { children: ReactNode }) {
	const [isDragging, setIsDragging] = useState(false)

	const value = useMemo<DragContextValue>(() => ({ isDragging, setIsDragging }), [isDragging])

	return <DragContext.Provider value={value}>{children}</DragContext.Provider>
}

export function useDrag() {
	const context = useContext(DragContext)
	if (context === undefined) {
		throw new Error('useDrag must be used within a DragProvider')
	}
	return context
}
