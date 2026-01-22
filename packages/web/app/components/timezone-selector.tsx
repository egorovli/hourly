import type { VariantProps } from 'class-variance-authority'
import type { buttonVariants } from '~/components/shadcn/ui/button.tsx'

import { useState } from 'react'

import { CheckIcon, ChevronsUpDownIcon, GlobeIcon } from 'lucide-react'

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
import { getTimezoneAbbreviation, SYSTEM_TIMEZONE_VALUE } from '~/lib/timezone/index.ts'
import { getTimezoneOptions } from '~/lib/timezone/timezones.ts'
import { cn } from '~/lib/util/index.ts'

interface TimezoneSelectorProps {
	value: string
	onChange: (timezone: string) => void
	/** The detected system timezone (for display when 'system' is selected) */
	systemTimezone?: string
	/** Timezones to show in the Quick Access group (e.g., team members' timezones) */
	quickAccessTimezones?: string[]
	size?: VariantProps<typeof buttonVariants>['size']
	disabled?: boolean
}

/**
 * Gets the display label for the trigger button.
 * Shows timezone abbreviation (e.g., "EST") or "System" for browser default.
 */
function getTriggerLabel(value: string, systemTimezone?: string): string {
	if (value === SYSTEM_TIMEZONE_VALUE) {
		// If we have the detected system timezone, show its abbreviation
		if (systemTimezone) {
			const abbr = getTimezoneAbbreviation(systemTimezone)
			return abbr ?? 'System'
		}
		return 'System'
	}

	const abbr = getTimezoneAbbreviation(value)
	return abbr ?? value.split('/').pop()?.replace(/_/g, ' ') ?? value
}

export function TimezoneSelector({
	value,
	onChange,
	systemTimezone,
	quickAccessTimezones,
	size = 'sm',
	disabled = false
}: TimezoneSelectorProps): React.ReactNode {
	const [open, setOpen] = useState(false)

	const timezoneGroups = getTimezoneOptions(quickAccessTimezones)
	const triggerLabel = getTriggerLabel(value, systemTimezone)

	return (
		<Popover
			open={open}
			onOpenChange={setOpen}
		>
			<PopoverTrigger asChild>
				<Button
					variant='ghost'
					size={size}
					role='combobox'
					aria-expanded={open}
					aria-label='Select timezone'
					disabled={disabled}
					className={cn('justify-between gap-1 font-normal', size === 'sm' && 'h-8 px-2 text-xs')}
				>
					<GlobeIcon className='size-3.5 text-muted-foreground' />
					<span className='max-w-20 truncate'>{triggerLabel}</span>
					<ChevronsUpDownIcon className='size-3 text-muted-foreground' />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className='w-64 p-0'
				align='end'
			>
				<Command>
					<CommandInput placeholder='Search timezone...' />
					<CommandList>
						<CommandEmpty>No timezone found.</CommandEmpty>
						{timezoneGroups.map(group => (
							<CommandGroup
								key={group.group}
								heading={group.group}
							>
								{group.options.map(option => (
									<CommandItem
										key={option.value}
										value={`${option.value} ${option.label}`}
										onSelect={() => {
											onChange(option.value)
											setOpen(false)
										}}
									>
										<span className='flex-1 truncate'>{option.label}</span>
										{value === option.value && <CheckIcon className='size-4 text-primary' />}
									</CommandItem>
								))}
							</CommandGroup>
						))}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
