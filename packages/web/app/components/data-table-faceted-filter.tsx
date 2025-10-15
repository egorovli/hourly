import { Check, PlusCircle } from 'lucide-react'

import { Badge } from '~/components/shadcn/ui/badge.tsx'
import { Button } from '~/components/shadcn/ui/button.tsx'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/shadcn/ui/popover.tsx'
import { Separator } from '~/components/shadcn/ui/separator.tsx'
import { cn } from '~/lib/util/index.ts'

import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator
} from '~/components/shadcn/ui/command.tsx'

export interface FilterOption {
	label: string
	value: string
	icon?: React.ComponentType<{ className?: string }>
	count?: number
}

interface FilterProps {
	title?: string
	options: FilterOption[]
	selectedValues: Set<string>
	onSelect: (values: Set<string>) => void
}

export function Filter({ title, options, selectedValues, onSelect }: FilterProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					size='sm'
					className='h-8 border-dashed'
				>
					<PlusCircle />
					{title}
					{selectedValues?.size > 0 && (
						<>
							<Separator
								orientation='vertical'
								className='mx-2 h-4'
							/>
							<Badge
								variant='secondary'
								className='rounded-sm px-1 font-normal lg:hidden'
							>
								{selectedValues.size}
							</Badge>
							<div className='hidden space-x-1 lg:flex'>
								{selectedValues.size > 2 ? (
									<Badge
										variant='secondary'
										className='rounded-sm px-1 font-normal'
									>
										{selectedValues.size} selected
									</Badge>
								) : (
									options
										.filter(option => selectedValues.has(option.value))
										.map(option => (
											<Badge
												variant='secondary'
												key={option.value}
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
								const isSelected = selectedValues.has(option.value)
								return (
									<CommandItem
										key={option.value}
										onSelect={() => {
											const newSelectedValues = new Set(selectedValues)
											if (isSelected) {
												newSelectedValues.delete(option.value)
											} else {
												newSelectedValues.add(option.value)
											}
											onSelect(newSelectedValues)
										}}
									>
										<div
											className={cn(
												'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
												isSelected
													? 'bg-primary text-primary-foreground'
													: 'opacity-50 [&_svg]:invisible'
											)}
										>
											<Check />
										</div>
										{option.icon && <option.icon className='mr-2 h-4 w-4 text-muted-foreground' />}
										<span>{option.label}</span>

										{typeof option.count === 'number' && (
											<span className='ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs'>
												{option.count}
											</span>
										)}
									</CommandItem>
								)
							})}
						</CommandGroup>
						{selectedValues.size > 0 && (
							<>
								<CommandSeparator />
								<CommandGroup>
									<CommandItem
										onSelect={() => onSelect(new Set())}
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
