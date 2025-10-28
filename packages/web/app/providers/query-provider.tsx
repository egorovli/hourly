import { QueryClientProvider } from '@tanstack/react-query'
import { client } from '~/lib/query/index.ts'

export interface QueryProviderProps {
	children: React.ReactNode
}

export function QueryProvider({ children }: QueryProviderProps): React.ReactNode {
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
