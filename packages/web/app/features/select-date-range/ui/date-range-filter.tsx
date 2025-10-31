import { useCallback, useMemo } from 'react'
import { DateTime } from 'luxon'
import { Button } from '~/shared/ui/shadcn/ui/button.tsx'
import { Popover, PopoverContent, PopoverTrigger } from '~/shared/ui/shadcn/ui/popover.tsx'
import { Calendar } from '~/shared/ui/shadcn/ui/calendar.tsx'
import { CalendarDays, ChevronDown } from 'lucide-react'
import { cn } from '~/lib/util/index.ts'
import type { DateRangeFilterProps, DateRange } from '../model/types.ts'

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps): React.ReactNode {
	const label = useMemo(() => {
		if (value?.from && value?.to) {
			const fromDt = DateTime.fromJSDate(value.from)
			const toDt = DateTime.fromJSDate(value.to)
			return `${fromDt.toFormat('MMM d, yyyy')} – ${toDt.toFormat('MMM d, yyyy')}`
		}
		if (value?.from) {
			const fromDt = DateTime.fromJSDate(value.from)
			return `${fromDt.toFormat('MMM d, yyyy')} – …`
		}
		return 'Select date range'
	}, [value])

	const defaultMonth = value?.from ?? value?.to ?? DateTime.now().toJSDate()

	const handleSelect = useCallback(
		(nextValue: DateRange | undefined) => {
			onChange(nextValue)
		},
		[onChange]
	)

	const handlePreset = useCallback(
		(preset: 'this-month' | 'previous-month') => {
			const baseDate =
				preset === 'this-month' ? DateTime.now() : DateTime.now().minus({ months: 1 })
			const from = baseDate.startOf('month').toJSDate()
			const to = baseDate.endOf('month').toJSDate()
			onChange({ from, to })
		},
		[onChange]
	)

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					className='flex min-w-60 items-center justify-between gap-2 font-normal'
				>
					<span className='flex items-center gap-2'>
						<CalendarDays
							className='h-4 w-4'
							aria-hidden
						/>
						<span className={cn('text-sm', { 'text-muted-foreground': !value?.from })}>
							{label}
						</span>
					</span>
					<ChevronDown
						className='h-4 w-4 opacity-60'
						aria-hidden
					/>
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className='w-auto p-0'
				align='start'
			>
				<div className='flex flex-col gap-3 p-3'>
					<Calendar
						mode='range'
						numberOfMonths={2}
						defaultMonth={defaultMonth}
						selected={value}
						onSelect={handleSelect}
						initialFocus
						className='rounded-lg border'
					/>
					<div className='flex flex-col gap-2 border-t pt-3'>
						<span className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
							Presets
						</span>
						<div className='flex flex-wrap gap-2'>
							<Button
								type='button'
								variant='outline'
								size='sm'
								className='flex-1'
								onClick={() => handlePreset('this-month')}
							>
								This month
							</Button>
							<Button
								type='button'
								variant='outline'
								size='sm'
								className='flex-1'
								onClick={() => handlePreset('previous-month')}
							>
								Previous month
							</Button>
						</div>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	)
}
