import type { ComponentType } from 'react'

import { CheckIcon, PlusCircleIcon } from 'lucide-react'

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
import { Separator } from '~/components/shadcn/ui/separator.tsx'
import { cn } from '~/lib/util/index.ts'

export interface FacetedFilterOption {
	label: string
	value: string
	icon?: ComponentType<{ className?: string }>
}

export interface FacetedFilterProps {
	title: string
	options: FacetedFilterOption[]
	selected: string[]
	onSelectionChange: (values: string[]) => void
}

export function FacetedFilter({
	title,
	options,
	selected,
	onSelectionChange
}: FacetedFilterProps): React.ReactNode {
	const selectedSet = new Set(selected)

	function toggleOption(value: string): void {
		const newSelected = new Set(selectedSet)
		if (newSelected.has(value)) {
			newSelected.delete(value)
		} else {
			newSelected.add(value)
		}
		onSelectionChange(Array.from(newSelected))
	}

	function clearSelection(): void {
		onSelectionChange([])
	}

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					size='sm'
					className='h-9 border-dashed'
				>
					<PlusCircleIcon className='mr-2 size-4' />
					{title}
					{selected.length > 0 && (
						<>
							<Separator
								orientation='vertical'
								className='mx-2 h-4'
							/>
							<Badge
								variant='secondary'
								className='rounded-sm px-1 font-normal lg:hidden'
							>
								{selected.length}
							</Badge>
							<div className='hidden space-x-1 lg:flex'>
								{selected.length > 2 ? (
									<Badge
										variant='secondary'
										className='rounded-sm px-1 font-normal'
									>
										{selected.length} selected
									</Badge>
								) : (
									options
										.filter(option => selectedSet.has(option.value))
										.map(option => (
											<Badge
												key={option.value}
												variant='secondary'
												className='rounded-sm px-1 font-normal'
											>
												{option.label}
											</Badge>
										))
								)}
							</div>
						</>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className='w-[200px] p-0'
				align='start'
			>
				<Command>
					<CommandInput placeholder={title} />
					<CommandList>
						<CommandEmpty>No results found.</CommandEmpty>
						<CommandGroup>
							{options.map(option => {
								const isSelected = selectedSet.has(option.value)
								const Icon = option.icon

								return (
									<CommandItem
										key={option.value}
										onSelect={() => toggleOption(option.value)}
									>
										<div
											className={cn(
												'mr-2 flex size-4 items-center justify-center rounded-sm border border-primary',
												isSelected
													? 'bg-primary text-primary-foreground'
													: 'opacity-50 [&_svg]:invisible'
											)}
										>
											<CheckIcon className='size-4' />
										</div>
										{Icon && <Icon className='mr-2 size-4 text-muted-foreground' />}
										<span>{option.label}</span>
									</CommandItem>
								)
							})}
						</CommandGroup>
						{selected.length > 0 && (
							<>
								<CommandSeparator />
								<CommandGroup>
									<CommandItem
										onSelect={clearSelection}
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
