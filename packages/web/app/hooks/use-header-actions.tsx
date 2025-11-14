import type React from 'react'

import { createContext, useContext, useState } from 'react'

interface HeaderActionsContextType {
	actions: React.ReactNode
	setActions: (actions: React.ReactNode) => void
}

const HeaderActionsContext = createContext<HeaderActionsContextType | undefined>(undefined)

export function HeaderActionsProvider({ children }: { children: React.ReactNode }) {
	const [actions, setActions] = useState<React.ReactNode>(null)

	return (
		<HeaderActionsContext.Provider value={{ actions, setActions }}>
			{children}
		</HeaderActionsContext.Provider>
	)
}

export function useHeaderActions() {
	const context = useContext(HeaderActionsContext)
	if (!context) {
		throw new Error('useHeaderActions must be used within HeaderActionsProvider')
	}
	return context
}
