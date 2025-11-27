import type * as React from 'react'

import { Check, ChevronsUpDown, FolderIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '~/components/shadcn/ui/avatar.tsx'
import { Badge } from '~/components/shadcn/ui/badge.tsx'
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

export type ProjectOptionLeaf = {
	id: string
	value: string
	label: string
	key?: string
	description?: string
	avatarUrl?: string
	disabled?: boolean
	archived?: boolean
	searchTerms?: string[]
}

export type ProjectOptionGroup = {
	id: string
	label: string
	description?: string
	avatarUrl?: string
	children: ProjectOption[]
}

export type ProjectOption = ProjectOptionLeaf | ProjectOptionGroup

export interface ProjectMultiSelectProps {
	options: ProjectOption[]
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

function isGroup(option: ProjectOption): option is ProjectOptionGroup {
	return 'children' in option
}

function isProject(value: string): boolean {
	return value.startsWith('project:')
}

function flattenOptions(options: ProjectOption[]): ProjectOptionLeaf[] {
	const result: ProjectOptionLeaf[] = []

	function traverse(items: ProjectOption[]) {
		for (const item of items) {
			if (isGroup(item)) {
				traverse(item.children)
			} else if (isProject(item.value)) {
				result.push(item)
			}
		}
	}

	traverse(options)
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

export function ProjectMultiSelect({
	options,
	value = [],
	onValueChange,
	placeholder = 'Select projects...',
	searchPlaceholder = 'Search projects...',
	emptyText = 'No projects found.',
	className,
	disabled = false,
	maxPreview = DEFAULT_PREVIEW_COUNT
}: ProjectMultiSelectProps): React.ReactNode {
	const [open, setOpen] = useState(false)

	const leaves = useMemo(() => flattenOptions(options), [options])
	const optionMap = useMemo(() => {
		const map = new Map<string, ProjectOptionLeaf>()
		for (const option of leaves) {
			map.set(option.value, option)
		}
		return map
	}, [leaves])

	const normalizedSelection = value.filter(v => isProject(v) && optionMap.has(v))

	const selectedOptions = useMemo(
		() =>
			normalizedSelection
				.map(v => optionMap.get(v))
				.filter((option): option is ProjectOptionLeaf => Boolean(option)),
		[normalizedSelection, optionMap]
	)

	const toggleValue = (value: string) => {
		if (!isProject(value)) {
			return
		}

		const option = optionMap.get(value)
		if (option?.archived === true) {
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

	const renderGroupNode = (option: ProjectOptionGroup, level: number): React.ReactNode => (
		<CommandGroup
			key={option.id}
			heading={
				<div className='flex items-center gap-1.5 px-2 py-1.5'>
					{option.avatarUrl ? (
						<Avatar className='size-4 shrink-0 rounded border border-border/60'>
							<AvatarImage
								src={option.avatarUrl}
								alt={option.label}
							/>
							<AvatarFallback
								className={cn(
									'rounded text-[10px] font-semibold uppercase',
									getColorClass(option.label)
								)}
							>
								{getInitials(option.label)}
							</AvatarFallback>
						</Avatar>
					) : (
						<FolderIcon className='size-3.5 shrink-0 text-muted-foreground' />
					)}
					<span className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
						{option.label}
					</span>
				</div>
			}
			className={cn('pt-0.5', level > 0 && 'border-l border-dashed border-border/50 ml-2 pl-2')}
		>
			{option.children.map(child => renderOption(child, level + 1))}
		</CommandGroup>
	)

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: UI rendering logic is intentionally branching for UX details
	const renderLeafNode = (option: ProjectOptionLeaf, level: number): React.ReactNode => {
		const selected = normalizedSelection.includes(option.value)
		const isArchived = option.archived === true

		return (
			<CommandItem
				key={option.value}
				value={option.value}
				keywords={[
					option.label,
					option.description ?? '',
					option.key ?? '',
					...(option.searchTerms ?? [])
				]}
				onSelect={() => {
					if (!isArchived) {
						toggleValue(option.value)
					}
				}}
				disabled={option.disabled || isArchived}
				className={cn('items-start gap-3 py-1.5', isArchived && 'opacity-50 cursor-not-allowed')}
				style={{ paddingLeft: level > 0 ? `${level * 10 + 12}px` : undefined }}
			>
				<div className='flex min-w-0 flex-1 items-center gap-2'>
					<Avatar
						className={cn(
							'size-6 shrink-0 rounded border border-border/60 bg-background text-[11px] font-semibold uppercase text-muted-foreground',
							isArchived && 'opacity-50'
						)}
					>
						{option.avatarUrl ? (
							<AvatarImage
								src={option.avatarUrl}
								alt={option.label}
							/>
						) : null}
						<AvatarFallback className={cn('rounded', getColorClass(option.label))}>
							{getInitials(option.key ?? option.label)}
						</AvatarFallback>
					</Avatar>
					<div className='flex min-w-0 flex-1 flex-col gap-0.5 text-left'>
						<div className='flex items-center justify-between gap-2'>
							<span
								className={cn(
									'truncate text-sm font-medium',
									isArchived ? 'text-muted-foreground' : 'text-foreground'
								)}
							>
								{option.label}
							</span>

							{option.key ? (
								<Badge
									variant='outline'
									className={cn(
										'shrink-0 border-border/60 text-[10px] font-mono font-semibold uppercase tracking-wide text-muted-foreground',
										isArchived && 'opacity-50'
									)}
								>
									{option.key}
								</Badge>
							) : null}
						</div>
						{option.description ? (
							<span
								className={cn(
									'truncate text-xs',
									isArchived ? 'text-muted-foreground/70' : 'text-muted-foreground'
								)}
							>
								{option.description}
							</span>
						) : null}
					</div>

					<Check
						className={cn(
							'size-4 text-primary transition-opacity',
							selected ? 'opacity-100' : 'opacity-0',
							isArchived && 'opacity-0'
						)}
					/>
				</div>
			</CommandItem>
		)
	}

	const renderOption = (option: ProjectOption, level = 0): React.ReactNode =>
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
												{getInitials(option.key ?? option.label)}
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
											? (selectedOptions[0]?.description ?? selectedOptions[0]?.key)
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
						{options.map(option => renderOption(option))}
					</CommandList>
				</Command>
				<div className='flex items-center justify-between border-t border-border/80 px-3 py-2'>
					<span className='text-xs text-muted-foreground'>
						{selectedOptions.length > 0
							? `${selectedOptions.length} selected`
							: 'No projects selected'}
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
