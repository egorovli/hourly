import type * as React from 'react'

import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { cn } from '~/lib/util/index.ts'
import { Badge } from '~/components/shadcn/ui/badge.tsx'
import { Button } from '~/components/shadcn/ui/button.tsx'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator
} from '~/components/shadcn/ui/command.tsx'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/shadcn/ui/popover.tsx'

const AVATAR_COLORS: readonly string[] = [
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

function getInitials(label: string): string {
	const trimmed = label.trim()
	if (!trimmed) {
		return '?'
	}

	const words = trimmed.split(/\s+/).filter(w => w.length > 0)
	if (words.length >= 2) {
		const firstWord = words[0]
		const lastWord = words[words.length - 1]
		if (firstWord && lastWord && firstWord[0] && lastWord[0]) {
			return (firstWord[0] + lastWord[0]).toUpperCase().slice(0, 2)
		}
	}
	return trimmed.slice(0, 2).toUpperCase() || '?'
}

function getColorClass(label: string): string {
	// Hash the label to get a consistent color
	let hash = 0
	for (let i = 0; i < label.length; i++) {
		hash = label.charCodeAt(i) + ((hash << 5) - hash)
	}
	const index = Math.abs(hash) % AVATAR_COLORS.length
	const color = AVATAR_COLORS[index]
	return color ?? 'bg-muted text-muted-foreground'
}

interface PlaceholderAvatarProps {
	label: string
	size?: 'sm' | 'md' | 'lg'
	className?: string
}

function PlaceholderAvatar({
	label,
	size = 'md',
	className
}: PlaceholderAvatarProps): React.ReactNode {
	const initials = getInitials(label)
	const colorClass = getColorClass(label)

	const sizeClasses = {
		sm: 'size-3 text-[10px]',
		md: 'size-5 text-xs',
		lg: 'size-8 text-sm'
	}

	return (
		<span
			aria-hidden='true'
			className={cn(
				'flex shrink-0 items-center justify-center rounded bg-muted font-medium',
				colorClass,
				sizeClasses[size],
				className
			)}
		>
			{initials}
		</span>
	)
}

interface AvatarWithFallbackProps {
	src?: string
	alt: string
	size?: 'sm' | 'md' | 'lg'
	className?: string
}

function AvatarWithFallback({
	src,
	alt,
	size = 'md',
	className
}: AvatarWithFallbackProps): React.ReactNode {
	const [imageError, setImageError] = useState(false)
	const [imageLoaded, setImageLoaded] = useState(false)

	const sizeClasses = {
		sm: 'size-3',
		md: 'size-5',
		lg: 'size-8'
	}

	if (!src || imageError) {
		return (
			<PlaceholderAvatar
				label={alt}
				size={size}
				className={className}
			/>
		)
	}

	return (
		<>
			{!imageLoaded && (
				<PlaceholderAvatar
					label={alt}
					size={size}
					className={className}
				/>
			)}
			<img
				src={src}
				alt={alt}
				className={cn(
					'shrink-0 rounded',
					sizeClasses[size],
					imageLoaded ? 'block' : 'hidden',
					className
				)}
				onLoad={() => {
					setImageLoaded(true)
				}}
				onError={() => {
					setImageError(true)
					setImageLoaded(false)
				}}
			/>
		</>
	)
}

export interface ProjectOption {
	value: string
	label: string
	avatarUrl?: string
	children?: ProjectOption[]
}

interface ProjectMultiSelectProps {
	options: ProjectOption[]
	value?: string[]
	onValueChange?: (value: string[]) => void
	placeholder?: string
	searchPlaceholder?: string
	emptyText?: string
	className?: string
	disabled?: boolean
	maxDisplay?: number
}

interface FlattenedOption extends ProjectOption {
	depth: number
}

function flattenOptions(options: ProjectOption[]): FlattenedOption[] {
	const flattened: FlattenedOption[] = []
	
	function traverse(items: ProjectOption[], depth = 0) {
		for (const item of items) {
			flattened.push({ ...item, depth })
			if (item.children && item.children.length > 0) {
				traverse(item.children, depth + 1)
			}
		}
	}

	traverse(options)
	return flattened
}

function filterOptions(options: ProjectOption[], search: string): ProjectOption[] {
	if (!search) {
		return options
	}
	
	const lowerSearch = search.toLowerCase()
	const filtered: ProjectOption[] = []
	
	function traverse(items: ProjectOption[], parentMatch = false): boolean {
		let hasMatch = false

		for (const item of items) {
			const itemMatch = item.label.toLowerCase().includes(lowerSearch)
			const children = item.children ? traverse(item.children, itemMatch || parentMatch) : false

			if (itemMatch || children || parentMatch) {
				filtered.push({
					...item,
					children:
						item.children && children
							? item.children.filter(child => {
									return (
										child.label.toLowerCase().includes(lowerSearch) ||
										(child.children?.some(c => c.label.toLowerCase().includes(lowerSearch)) ??
											false)
									)
								})
							: item.children
				})
				hasMatch = true
			}
		}

		return hasMatch
	}

	traverse(options)
	return filtered
}

function isProject(value: string): boolean {
	return value.startsWith('project:')
}

function renderOptions(
	options: ProjectOption[],
	selectedValues: Set<string>,
	onToggle: (value: string) => void,
	depth = 0
): React.ReactNode {
	return options.map(option => {
		const isProjectOption = isProject(option.value)
		const isSelected = isProjectOption && selectedValues.has(option.value)
		const hasChildren = option.children && option.children.length > 0

		if (!isProjectOption) {
			// Render as a section header/label
			return (
				<div key={option.value}>
					<div
						className={cn(
							'flex items-center gap-2 px-2 py-1.5',
							depth === 0 ? 'pt-2 pb-1' : 'pt-1.5 pb-1'
						)}
					>
						<AvatarWithFallback
							src={option.avatarUrl}
							alt={option.label}
							size='md'
						/>
						<span className='flex-1 truncate text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
							{option.label}
						</span>
					</div>
					{hasChildren &&
						option.children &&
						renderOptions(option.children, selectedValues, onToggle, depth + 1)}
				</div>
			)
		}

		// Render as a selectable project option
		return (
			<div key={option.value}>
				<CommandItem
					value={option.value}
					onSelect={() => {
						onToggle(option.value)
					}}
					className={cn('flex items-center gap-2', depth > 1 && 'pl-6')}
				>
					<div
						className={cn(
							'flex size-4 shrink-0 items-center justify-center rounded-[4px] border',
							isSelected
								? 'bg-primary border-primary text-primary-foreground'
								: 'border-input [&_svg]:invisible'
						)}
					>
						<CheckIcon className='size-3.5 text-primary-foreground' />
					</div>
					<AvatarWithFallback
						src={option.avatarUrl}
						alt={option.label}
						size='md'
					/>
					<span className='flex-1 truncate'>{option.label}</span>
				</CommandItem>
				{hasChildren &&
					option.children &&
					renderOptions(option.children, selectedValues, onToggle, depth + 1)}
			</div>
		)
	})
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
	maxDisplay = 2
}: ProjectMultiSelectProps): React.ReactNode {
	const [open, setOpen] = useState(false)
	const [search, setSearch] = useState('')

	// Filter out non-project values to ensure only projects can be selected
	const projectValues = useMemo(() => value.filter(v => isProject(v)), [value])
	const selectedValues = useMemo(() => new Set(projectValues), [projectValues])
	const flattenedOptions = useMemo(() => flattenOptions(options), [options])
	const filteredOptions = useMemo(() => filterOptions(options, search), [options, search])

	const selectedOptions = useMemo(() => {
		return flattenedOptions.filter(opt => isProject(opt.value) && selectedValues.has(opt.value))
	}, [flattenedOptions, selectedValues])

	const handleToggle = (optionValue: string) => {
		// Only allow toggling projects
		if (!isProject(optionValue)) {
			return
		}

		const newValue = selectedValues.has(optionValue)
			? projectValues.filter(v => v !== optionValue)
			: [...projectValues, optionValue]
		onValueChange?.(newValue)
	}

	const handleClear = () => {
		onValueChange?.([])
		setOpen(false)
	}

	const displayText = useMemo(() => {
		if (selectedOptions.length === 0) {
			return placeholder
		}
		if (selectedOptions.length <= maxDisplay) {
			return selectedOptions.map(opt => opt.label).join(', ')
		}
		return `${selectedOptions.length} selected`
	}, [selectedOptions, maxDisplay, placeholder])

	return (
		<Popover
			open={open}
			onOpenChange={setOpen}
		>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					role='combobox'
					aria-expanded={open}
					className={cn('w-full justify-between min-h-10 h-auto py-2', className)}
					disabled={disabled}
				>
					<div className='flex flex-1 flex-wrap items-center gap-1.5'>
						{selectedOptions.length === 0 ? (
							<span className='text-muted-foreground'>{placeholder}</span>
						) : (
							<>
								{selectedOptions.slice(0, maxDisplay).map(option => (
									<Badge
										key={option.value}
										variant='secondary'
										className='rounded-sm px-1.5 py-0.5 font-normal'
									>
										<AvatarWithFallback
											src={option.avatarUrl}
											alt={option.label}
											size='sm'
											className='mr-1'
										/>
										{option.label}
										<button
											type='button'
											onClick={e => {
												e.stopPropagation()
												handleToggle(option.value)
											}}
											className='ml-1 rounded-full hover:bg-secondary-foreground/20'
										>
											<XIcon className='size-3' />
										</button>
									</Badge>
								))}
								{selectedOptions.length > maxDisplay && (
									<Badge
										variant='secondary'
										className='rounded-sm px-1.5 py-0.5 font-normal'
									>
										+{selectedOptions.length - maxDisplay} more
									</Badge>
								)}
							</>
						)}
					</div>
					<ChevronsUpDownIcon className='ml-2 size-4 shrink-0 opacity-50' />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className='w-[--radix-popover-trigger-width] p-0'
				align='start'
			>
				<Command shouldFilter={false}>
					<CommandInput
						placeholder={searchPlaceholder}
						value={search}
						onValueChange={setSearch}
					/>
					<CommandList>
						<CommandEmpty>{emptyText}</CommandEmpty>
						<CommandGroup>
							{renderOptions(filteredOptions, selectedValues, handleToggle)}
						</CommandGroup>
						{selectedValues.size > 0 && (
							<>
								<CommandSeparator />
								<CommandGroup>
									<CommandItem
										onSelect={handleClear}
										className='justify-center text-center'
									>
										Clear filters
									</CommandItem>
								</CommandGroup>
							</>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
