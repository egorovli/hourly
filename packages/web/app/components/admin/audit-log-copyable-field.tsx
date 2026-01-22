import { useCallback, useState } from 'react'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { toast } from 'sonner'

import { truncateUuid } from '~/components/admin/audit-log-utils.tsx'
import { Button } from '~/components/shadcn/ui/button.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger
} from '~/components/shadcn/ui/tooltip.tsx'
import { cn } from '~/lib/util/index.ts'

export interface CopyableFieldProps {
	value: string
	label?: string
	truncate?: boolean
	truncateChars?: number
	className?: string
}

/**
 * A reusable component that displays a value with copy-to-clipboard functionality.
 * Shows truncated UUIDs with full value on hover, and provides visual feedback on copy.
 */
export function CopyableField({
	value,
	label,
	truncate = true,
	truncateChars = 8,
	className
}: CopyableFieldProps): React.ReactNode {
	const [copied, setCopied] = useState(false)

	const displayValue = truncate ? truncateUuid(value, truncateChars) : value
	const showTooltip = truncate && value.length > truncateChars * 2 + 3

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(value)
			setCopied(true)
			toast.success(label ? `${label} copied to clipboard` : 'Copied to clipboard')
			setTimeout(() => setCopied(false), 2000)
		} catch {
			toast.error('Failed to copy to clipboard')
		}
	}, [value, label])

	const content = (
		<div className={cn('flex items-center justify-end gap-1.5 group', className)}>
			<Button
				variant='ghost'
				size='icon'
				className='size-5 opacity-0 group-hover:opacity-100 transition-opacity'
				onClick={e => {
					e.stopPropagation()
					void handleCopy()
				}}
			>
				{copied ? (
					<CheckIcon className='size-3 text-green-600' />
				) : (
					<CopyIcon className='size-3 text-muted-foreground' />
				)}
			</Button>
			<code className='font-mono text-xs bg-muted px-1.5 py-0.5 rounded'>{displayValue}</code>
		</div>
	)

	if (showTooltip) {
		return (
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>{content}</TooltipTrigger>
					<TooltipContent>
						<code className='font-mono text-xs'>{value}</code>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		)
	}

	return content
}

export interface CopyableTextProps {
	value: string
	label?: string
	className?: string
}

/**
 * A simpler copyable component for non-UUID text that doesn't need truncation.
 */
export function CopyableText({ value, label, className }: CopyableTextProps): React.ReactNode {
	const [copied, setCopied] = useState(false)

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(value)
			setCopied(true)
			toast.success(label ? `${label} copied to clipboard` : 'Copied to clipboard')
			setTimeout(() => setCopied(false), 2000)
		} catch {
			toast.error('Failed to copy to clipboard')
		}
	}, [value, label])

	return (
		<div className={cn('flex items-center justify-end gap-1.5 group', className)}>
			<Button
				variant='ghost'
				size='icon'
				className='size-5 opacity-0 group-hover:opacity-100 transition-opacity'
				onClick={e => {
					e.stopPropagation()
					void handleCopy()
				}}
			>
				{copied ? (
					<CheckIcon className='size-3 text-green-600' />
				) : (
					<CopyIcon className='size-3 text-muted-foreground' />
				)}
			</Button>
			<span className='text-sm'>{value}</span>
		</div>
	)
}
