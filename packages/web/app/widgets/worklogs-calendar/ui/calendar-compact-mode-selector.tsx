import type { CalendarCompactMode } from '~/domain/preferences.ts'

import { AlignJustify, Check, Minimize2, MoveVertical } from 'lucide-react'

import { Button } from '~/shared/ui/shadcn/ui/button.tsx'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '~/shared/ui/shadcn/ui/dropdown-menu.tsx'

export interface CalendarCompactModeSelectorProps {
	value: CalendarCompactMode
	onChange: (mode: CalendarCompactMode) => void
}

const COMPACT_MODE_OPTIONS: Array<{
	value: CalendarCompactMode
	label: string
	icon: React.ComponentType<{ className?: string }>
}> = [
	{
		value: 'standard',
		label: 'Standard',
		icon: AlignJustify
	},
	{
		value: 'comfortable',
		label: 'Comfortable',
		icon: MoveVertical
	},
	{
		value: 'compact',
		label: 'Compact',
		icon: Minimize2
	}
]

export function CalendarCompactModeSelector({
	value,
	onChange
}: CalendarCompactModeSelectorProps): React.ReactElement {
	const currentOption = COMPACT_MODE_OPTIONS.find(option => option.value === value)
	const Icon = currentOption?.icon ?? AlignJustify

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type='button'
					size='icon'
					variant='ghost'
					className='h-8 w-8'
					aria-label='Calendar density'
					title='Calendar density'
				>
					<Icon className='h-4 w-4' />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end'>
				{COMPACT_MODE_OPTIONS.map(option => {
					const OptionIcon = option.icon
					return (
						<DropdownMenuItem
							key={option.value}
							onClick={() => onChange(option.value)}
							className='flex items-center gap-2'
						>
							<OptionIcon className='h-4 w-4' />
							<span>{option.label}</span>
							{value === option.value && <Check className='ml-auto h-4 w-4' />}
						</DropdownMenuItem>
					)
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
