import type React from 'react'
import { cn } from '~/lib/util/index.ts'

export interface ErrorPlaceholderProps {
	message: string
	className?: string
}

/**
 * Compact error display component for inline error states
 */
export function ErrorPlaceholder({ message, className }: ErrorPlaceholderProps): React.ReactNode {
	return (
		<output
			className={cn(
				'flex h-10 min-w-32 items-center justify-center rounded-md border border-destructive/50 bg-destructive/10 px-3 text-sm font-medium text-destructive',
				className
			)}
			aria-label={`Error: ${message}`}
			title={message}
		>
			Error
		</output>
	)
}
