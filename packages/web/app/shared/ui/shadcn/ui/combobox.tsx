import type * as React from 'react'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { useState } from 'react'

import { cn } from '~/lib/util/index.ts'
import { Button } from '~/shared/ui/shadcn/ui/button.tsx'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from '~/shared/ui/shadcn/ui/command.tsx'
import { Popover, PopoverContent, PopoverTrigger } from '~/shared/ui/shadcn/ui/popover.tsx'

export interface ComboboxOption {
	value: string
	label: string
}

export interface ComboboxProps {
	options: ComboboxOption[]
	value?: string
	onValueChange?: (value: string) => void
	placeholder?: string
	searchPlaceholder?: string
	emptyText?: string
	className?: string
	disabled?: boolean
}

export function Combobox({
	options,
	value,
	onValueChange,
	placeholder = 'Select...',
	searchPlaceholder = 'Search...',
	emptyText = 'No results found.',
	className,
	disabled = false
}: ComboboxProps): React.ReactNode {
	const [open, setOpen] = useState(false)

	const selectedOption = options.find(option => option.value === value)

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
					className={cn('w-full justify-between', className)}
					disabled={disabled}
				>
					{selectedOption ? selectedOption.label : placeholder}
					<ChevronsUpDownIcon className='ml-2 size-4 shrink-0 opacity-50' />
				</Button>
			</PopoverTrigger>
			<PopoverContent className='w-[--radix-popover-trigger-width] p-0'>
				<Command>
					<CommandInput placeholder={searchPlaceholder} />
					<CommandList>
						<CommandEmpty>{emptyText}</CommandEmpty>
						<CommandGroup>
							{options.map(option => (
								<CommandItem
									key={option.value}
									value={option.value}
									onSelect={currentValue => {
										onValueChange?.(currentValue === value ? '' : currentValue)
										setOpen(false)
									}}
								>
									<CheckIcon
										className={cn(
											'mr-2 size-4',
											value === option.value ? 'opacity-100' : 'opacity-0'
										)}
									/>
									{option.label}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
