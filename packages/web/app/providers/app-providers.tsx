import { QueryProvider } from './query-provider.tsx'

export interface AppProvidersProps {
	children: React.ReactNode
}

/**
 * Root application providers composition.
 * Wraps the application with all necessary context providers.
 *
 * Current providers:
 * - QueryProvider: TanStack Query for server state management
 *
 * Note: Theme is handled via preferences loaded in root loader
 * and applied as className on <html> element for SSR compatibility.
 */
export function AppProviders({ children }: AppProvidersProps): React.ReactNode {
	return <QueryProvider>{children}</QueryProvider>
}
