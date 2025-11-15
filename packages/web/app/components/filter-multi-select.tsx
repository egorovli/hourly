import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'

import { Check, ChevronsUpDown } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '~/components/shadcn/ui/avatar.tsx'
import { Badge } from '~/components/shadcn/ui/badge.tsx'
import { Button } from '~/components/shadcn/ui/button.tsx'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from '~/components/shadcn/ui/command.tsx'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/shadcn/ui/popover.tsx'
import { cn } from '~/lib/util/index.ts'

export type FilterOptionAvatar = {
	src?: string
	fallback?: string
}

export type FilterOptionBase = {
	id: string
	label: string
	description?: string
	meta?: string
	avatar?: FilterOptionAvatar
	searchTerms?: string[]
}

export type FilterOptionLeaf = FilterOptionBase & {
	value: string
	disabled?: boolean
}

export type FilterOptionGroup = FilterOptionBase & {
	children: NestedFilterOption[]
}

export type NestedFilterOption = FilterOptionLeaf | FilterOptionGroup

export interface FilterMultiSelectProps {
	options: NestedFilterOption[]
	selectedValues: string[]
	onChange: (values: string[]) => void
	placeholder?: string
	searchPlaceholder?: string
	emptyLabel?: string
	className?: string
	maxPreview?: number
}

const DEFAULT_PREVIEW_COUNT = 3

export function FilterMultiSelect({
	options,
	selectedValues,
	onChange,
	placeholder = 'Select options',
	searchPlaceholder = 'Search...',
	emptyLabel = 'No results found.',
	className,
	maxPreview = DEFAULT_PREVIEW_COUNT
}: FilterMultiSelectProps): ReactNode {
	const [open, setOpen] = useState(false)

	const leaves = useMemo(() => flattenOptions(options), [options])
	const optionMap = useMemo(() => {
		const map = new Map<string, FilterOptionLeaf>()
		for (const option of leaves) {
			map.set(option.value, option)
		}
		return map
	}, [leaves])

	const normalizedSelection = selectedValues.filter(value => optionMap.has(value))

	const selectedOptions = useMemo(
		() =>
			normalizedSelection
				.map(value => optionMap.get(value))
				.filter((option): option is FilterOptionLeaf => Boolean(option)),
		[normalizedSelection, optionMap]
	)

	const toggleValue = (value: string) => {
		const exists = normalizedSelection.includes(value)
		const next = exists
			? normalizedSelection.filter(item => item !== value)
			: [...normalizedSelection, value]
		onChange(next)
	}

	const clearSelection = () => {
		onChange([])
	}

	const preview = selectedOptions.slice(0, maxPreview)
	const remaining = Math.max(selectedOptions.length - preview.length, 0)

	const renderGroupNode = (option: FilterOptionGroup, level: number) => (
		<CommandGroup
			key={option.id}
			heading={
				<div className='flex flex-col text-left'>
					<span className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
						{option.label}
					</span>
					{option.description ? (
						<span className='text-[11px] font-normal text-muted'>{option.description}</span>
					) : null}
				</div>
			}
			className={cn(
				'pt-1',
				level > 0 && 'border-l border-dashed border-border/50',
				level > 0 && 'ml-2 pl-2'
			)}
		>
			{option.children.map(child => renderOption(child, level + 1))}
		</CommandGroup>
	)

	const renderLeafNode = (option: FilterOptionLeaf, level: number) => {
		const selected = normalizedSelection.includes(option.value)

		return (
			<CommandItem
				key={option.value}
				value={option.value}
				keywords={[
					option.label,
					option.description ?? '',
					option.meta ?? '',
					...(option.searchTerms ?? [])
				]}
				onSelect={() => toggleValue(option.value)}
				disabled={option.disabled}
				className='items-start gap-3 py-2'
				style={{ paddingLeft: level > 0 ? `${level * 12 + 8}px` : undefined }}
			>
				<div className='flex min-w-0 flex-1 items-center gap-3'>
					<Avatar className='size-9 shrink-0 border border-border/60 bg-background text-[11px] font-semibold uppercase text-muted-foreground'>
						{option.avatar?.src ? (
							<AvatarImage
								src={option.avatar.src}
								alt={option.label}
							/>
						) : null}
						<AvatarFallback>
							{option.avatar?.fallback ?? getInitials(option.meta ?? option.label)}
						</AvatarFallback>
					</Avatar>
					<div className='flex min-w-0 flex-1 flex-col gap-0.5 text-left'>
						<div className='flex items-center gap-2'>
							<span className='truncate text-sm font-medium text-foreground'>{option.label}</span>
							{option.meta ? (
								<Badge
									variant='outline'
									className='border-border/60 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'
								>
									{option.meta}
								</Badge>
							) : null}
						</div>
						{option.description ? (
							<span className='truncate text-xs text-muted-foreground'>{option.description}</span>
						) : null}
					</div>
				</div>
				<Check
					className={cn(
						'ml-auto size-4 text-light-sky-blue-500 transition-opacity',
						selected ? 'opacity-100' : 'opacity-0'
					)}
				/>
			</CommandItem>
		)
	}

	const renderOption = (option: NestedFilterOption, level = 0): ReactNode =>
		isGroup(option) ? renderGroupNode(option, level) : renderLeafNode(option, level)

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
				>
					<div className='flex min-w-0 flex-1 items-center gap-3'>
						{selectedOptions.length > 0 ? (
							<>
								<div className='flex -space-x-2'>
									{preview.map(option => (
										<Avatar
											key={option.value}
											className='size-6 border border-background bg-muted text-[10px] font-semibold uppercase text-muted-foreground [&:not(:first-child)]:ring-2 [&:not(:first-child)]:ring-background'
										>
											{option.avatar?.src ? (
												<AvatarImage
													src={option.avatar.src}
													alt={option.label}
												/>
											) : null}
											<AvatarFallback>
												{option.avatar?.fallback ?? getInitials(option.meta ?? option.label)}
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
											? (selectedOptions[0]?.description ?? selectedOptions[0]?.meta)
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
				<Command className='[&_[cmdk-group-heading]]:text-muted-foreground/80'>
					<CommandInput placeholder={searchPlaceholder} />
					<CommandList>
						<CommandEmpty>{emptyLabel}</CommandEmpty>
						{options.map(option => renderOption(option))}
					</CommandList>
				</Command>
				<div className='flex items-center justify-between border-t border-border/80 px-3 py-2'>
					<span className='text-xs text-muted-foreground'>
						{selectedOptions.length > 0
							? `${selectedOptions.length} selected`
							: 'No filters selected'}
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

function isGroup(option: NestedFilterOption): option is FilterOptionGroup {
	return 'children' in option
}

function flattenOptions(options: NestedFilterOption[]): FilterOptionLeaf[] {
	const result: FilterOptionLeaf[] = []

	for (const option of options) {
		if (isGroup(option)) {
			result.push(...flattenOptions(option.children))
		} else {
			result.push(option)
		}
	}

	return result
}

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
