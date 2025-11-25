import type * as React from 'react'

import { ChevronDownIcon } from 'lucide-react'
import { useState } from 'react'

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'

import { cn } from '~/lib/util/index.ts'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from '~/components/shadcn/ui/collapsible.tsx'

interface DebugPanelProps {
	data: Record<string, unknown>
	title?: string
	className?: string
}

function serializeForDebug(obj: unknown): unknown {
	if (obj === null || obj === undefined) {
		return obj
	}

	if (obj instanceof Map) {
		return Object.fromEntries(obj)
	}

	if (obj instanceof Set) {
		return Array.from(obj)
	}

	if (Array.isArray(obj)) {
		return obj.map(serializeForDebug)
	}

	if (typeof obj === 'object') {
		const result: Record<string, unknown> = {}
		for (const [key, value] of Object.entries(obj)) {
			result[key] = serializeForDebug(value)
		}
		return result
	}

	return obj
}

export function DebugPanel({
	data,
	title = 'Debug Panel',
	className
}: DebugPanelProps): React.ReactNode | null {
	const [isOpen, setIsOpen] = useState(false)

	// Only show in development - check if we're in dev mode
	const isDev =
		typeof window !== 'undefined' &&
		(window.location.hostname === 'localhost' ||
			window.location.hostname === '127.0.0.1' ||
			window.location.hostname.includes('localhost') ||
			window.location.port === '3000')

	if (!isDev) {
		return null
	}

	const serializedData = serializeForDebug(data)
	const jsonString = JSON.stringify(serializedData, null, 2)

	return (
		<Collapsible
			open={isOpen}
			onOpenChange={setIsOpen}
			className={cn('w-full', className)}
		>
			<CollapsibleTrigger className='flex w-full items-center justify-between rounded-t-lg border border-border bg-muted/50 px-4 py-2 text-sm font-medium hover:bg-muted/80 transition-colors'>
				<span className='flex items-center gap-2'>
					<span>{title}</span>
					<span className='text-muted-foreground text-xs'>(dev only)</span>
				</span>
				<ChevronDownIcon className={cn('size-4 transition-transform', isOpen && 'rotate-180')} />
			</CollapsibleTrigger>
			<CollapsibleContent className='border-x border-b border-border rounded-b-lg bg-background'>
				<div className='relative max-h-[600px] overflow-auto'>
					<SyntaxHighlighter
						language='json'
						// style={dark}
						customStyle={{
							margin: 0,
							padding: '1rem',
							background: 'transparent',
							fontSize: '0.875rem',
							lineHeight: '1.5'
						}}
						wrapLines
						wrapLongLines
					>
						{jsonString}
					</SyntaxHighlighter>
				</div>
			</CollapsibleContent>
		</Collapsible>
	)
}
