import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
// import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'

import { Button } from '~/shared/ui/shadcn/ui/button.tsx'

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from '~/shared/ui/shadcn/ui/collapsible.tsx'

import { cn } from '~/lib/util/index.ts'

type CollapsibleDebugPanelProps = {
	title?: string
	data: unknown
	className?: string
}

export function CollapsibleDebugPanel({
	title = 'Debug',
	data,
	className
}: CollapsibleDebugPanelProps) {
	const [open, setOpen] = useState(false)

	const formatted = JSON.stringify(
		data,
		(_key, value) => {
			if (value instanceof Temporal.PlainDate) {
				return value.toString()
			}
			return value
		},
		2
	)

	return (
		<Collapsible
			open={open}
			onOpenChange={setOpen}
			className={cn('overflow-hidden rounded-md border bg-muted/50', className)}
		>
			<CollapsibleTrigger asChild>
				<Button
					type='button'
					variant='ghost'
					size='sm'
					className='flex w-full items-center justify-between gap-2 px-3 py-2 text-left font-medium'
				>
					<span>{title}</span>
					<ChevronDown
						className={cn(
							'size-4 transition-transform duration-200',
							open ? 'rotate-180' : 'rotate-0'
						)}
					/>
				</Button>
			</CollapsibleTrigger>

			<CollapsibleContent className='border-t'>
				<div className='max-h-64 overflow-auto text-xs'>
					{/* <SyntaxHighlighter
						language='json'
						customStyle={{
							background: 'transparent',
							margin: 0,
							padding: '1rem'
						}}
					>
						{formatted ?? '{}'}
					</SyntaxHighlighter> */}
				</div>
			</CollapsibleContent>
		</Collapsible>
	)
}
