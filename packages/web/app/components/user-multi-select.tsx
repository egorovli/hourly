import type * as React from 'react'

import { Check, ChevronsUpDown } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '~/components/shadcn/ui/avatar.tsx'
import { Button } from '~/components/shadcn/ui/button.tsx'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/shadcn/ui/popover.tsx'
import { cn } from '~/lib/util/index.ts'

import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from '~/components/shadcn/ui/command.tsx'

export type UserOption = {
	id: string
	value: string
	label: string
	email?: string
	avatarUrl?: string
	disabled?: boolean
	active?: boolean
	searchTerms?: string[]
}

export interface UserMultiSelectProps {
	options: UserOption[]
	value?: string[]
	onValueChange?: (value: string[]) => void
	placeholder?: string
	searchPlaceholder?: string
	emptyText?: string
	className?: string
	disabled?: boolean
	maxPreview?: number
}

const DEFAULT_PREVIEW_COUNT = 3

function getInitials(value: string): string {
	const cleaned = value.trim()
	if (!cleaned) {
		return '??'
	}

	const segments = cleaned.split(/\s+/).filter(Boolean)
	if (segments.length === 0) {
		return cleaned.slice(0, 2).toUpperCase()
	}

	if (segments.length === 1) {
		const [first] = segments
		return (first ?? cleaned).slice(0, 2).toUpperCase()
	}

	const initials = segments
		.map(segment => (segment?.[0] ?? '').toUpperCase())
		.join('')
		.slice(0, 2)

	return initials || cleaned.slice(0, 2).toUpperCase()
}

function getColorClass(label: string): string {
	const colors = [
		'bg-indigo-400/20 text-indigo-500',
		'bg-purple-400/20 text-purple-500',
		'bg-rose-400/20 text-rose-500',
		'bg-blue-400/20 text-blue-500',
		'bg-green-400/20 text-green-500',
		'bg-yellow-400/20 text-yellow-500',
		'bg-orange-400/20 text-orange-500',
		'bg-pink-400/20 text-pink-500',
		'bg-cyan-400/20 text-cyan-500',
		'bg-emerald-400/20 text-emerald-500'
	] as const

	let hash = 0
	for (let i = 0; i < label.length; i++) {
		hash = label.charCodeAt(i) + ((hash << 5) - hash)
	}
	const index = Math.abs(hash) % colors.length
	return colors[index] ?? 'bg-muted text-muted-foreground'
}

export function UserMultiSelect({
	options,
	value = [],
	onValueChange,
	placeholder = 'Select users...',
	searchPlaceholder = 'Search users...',
	emptyText = 'No users found.',
	className,
	disabled = false,
	maxPreview = DEFAULT_PREVIEW_COUNT
}: UserMultiSelectProps): React.ReactNode {
	const [open, setOpen] = useState(false)

	const optionMap = useMemo(() => {
		const map = new Map<string, UserOption>()
		for (const option of options) {
			map.set(option.value, option)
		}
		return map
	}, [options])

	const normalizedSelection = value.filter(v => optionMap.has(v))

	const selectedOptions = useMemo(
		() =>
			normalizedSelection
				.map(v => optionMap.get(v))
				.filter((option): option is UserOption => Boolean(option)),
		[normalizedSelection, optionMap]
	)

	const toggleValue = (value: string) => {
		const option = optionMap.get(value)
		if (option?.disabled === true || option?.active === false) {
			return
		}

		const exists = normalizedSelection.includes(value)
		const next = exists
			? normalizedSelection.filter(item => item !== value)
			: [...normalizedSelection, value]
		onValueChange?.(next)
	}

	const clearSelection = () => {
		onValueChange?.([])
	}

	const preview = selectedOptions.slice(0, maxPreview)
	const remaining = Math.max(selectedOptions.length - preview.length, 0)

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: UI rendering logic needs branching for badges/avatars
	const renderUserOption = (option: UserOption): React.ReactNode => {
		const selected = normalizedSelection.includes(option.value)
		const isInactive = option.active === false

		return (
			<CommandItem
				key={option.value}
				value={option.value}
				keywords={[option.label, option.email ?? '', ...(option.searchTerms ?? [])]}
				onSelect={() => {
					if (!isInactive) {
						toggleValue(option.value)
					}
				}}
				disabled={option.disabled || isInactive}
				className={cn('items-start gap-3 py-1.5', isInactive && 'opacity-50 cursor-not-allowed')}
			>
				<div className='flex min-w-0 flex-1 items-center gap-2'>
					<Avatar
						className={cn(
							'size-6 shrink-0 rounded border border-border/60 bg-background text-[11px] font-semibold uppercase text-muted-foreground',
							isInactive && 'opacity-50'
						)}
					>
						{option.avatarUrl ? (
							<AvatarImage
								src={option.avatarUrl}
								alt={option.label}
							/>
						) : null}
						<AvatarFallback className={cn('rounded', getColorClass(option.label))}>
							{getInitials(option.label)}
						</AvatarFallback>
					</Avatar>
					<div className='flex min-w-0 flex-1 flex-col gap-0.5 text-left'>
						<span
							className={cn(
								'truncate text-sm font-medium',
								isInactive ? 'text-muted-foreground' : 'text-foreground'
							)}
						>
							{option.label}
						</span>
						{option.email ? (
							<span
								className={cn(
									'truncate text-xs',
									isInactive ? 'text-muted-foreground/70' : 'text-muted-foreground'
								)}
							>
								{option.email}
							</span>
						) : null}
					</div>

					<Check
						className={cn(
							'size-4 text-primary transition-opacity',
							selected ? 'opacity-100' : 'opacity-0',
							isInactive && 'opacity-0'
						)}
					/>
				</div>
			</CommandItem>
		)
	}

	return (
		<Popover
			open={open}
			onOpenChange={setOpen}
		>
			<PopoverTrigger asChild>
				<Button
					type='button'
					variant='outline'
					role='combobox'
					aria-expanded={open}
					className={cn(
						'min-h-10 w-full justify-between border-input bg-background text-left font-normal hover:bg-background',
						className
					)}
					disabled={disabled}
				>
					<div className='flex min-w-0 flex-1 items-center gap-3'>
						{selectedOptions.length > 0 ? (
							<>
								<div className='flex -space-x-2'>
									{preview.map(option => (
										<Avatar
											key={option.value}
											className='size-6 border border-background bg-muted text-[10px] font-semibold uppercase text-muted-foreground not-first:ring-2 not-first:ring-background'
										>
											{option.avatarUrl ? (
												<AvatarImage
													src={option.avatarUrl}
													alt={option.label}
												/>
											) : null}
											<AvatarFallback className={cn(getColorClass(option.label))}>
												{getInitials(option.label)}
											</AvatarFallback>
										</Avatar>
									))}
									{remaining > 0 ? (
										<div className='flex size-6 items-center justify-center rounded-full border border-dashed border-border/70 bg-background text-[10px] font-semibold text-muted-foreground'>
											+{remaining}
										</div>
									) : null}
								</div>
								<div className='flex min-w-0 flex-col text-left'>
									<span className='truncate text-sm font-medium text-foreground'>
										{selectedOptions.length === 1
											? selectedOptions[0]?.label
											: `${selectedOptions.length} selected`}
									</span>
									<span className='truncate text-xs text-muted-foreground'>
										{selectedOptions.length === 1
											? selectedOptions[0]?.email
											: preview.map(option => option.label).join(', ')}
									</span>
								</div>
							</>
						) : (
							<span className='text-sm text-muted-foreground'>{placeholder}</span>
						)}
					</div>
					<ChevronsUpDown className='size-4 shrink-0 text-muted-foreground/80' />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align='start'
				className='w-[--radix-popover-trigger-width] border-border bg-popover p-0'
			>
				<Command className='**:[[cmdk-group-heading]]:text-muted-foreground/80'>
					<CommandInput placeholder={searchPlaceholder} />
					<CommandList>
						<CommandEmpty>{emptyText}</CommandEmpty>
						<CommandGroup>{options.map(option => renderUserOption(option))}</CommandGroup>
					</CommandList>
				</Command>
				<div className='flex items-center justify-between border-t border-border/80 px-3 py-2'>
					<span className='text-xs text-muted-foreground'>
						{selectedOptions.length > 0
							? `${selectedOptions.length} selected`
							: 'No users selected'}
					</span>
					<Button
						type='button'
						variant='ghost'
						size='sm'
						disabled={selectedOptions.length === 0}
						onClick={clearSelection}
						className='h-7 px-2 text-xs text-muted-foreground hover:text-foreground'
					>
						Clear
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	)
}
