import type { DateRange } from 'react-day-picker'

import { Calendar as CalendarIcon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '~/components/shadcn/ui/button.tsx'
import { Calendar } from '~/components/shadcn/ui/calendar.tsx'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/shadcn/ui/popover.tsx'

type DateRangePickerProps = {
	dateRange?: DateRange
	onDateRangeChange?: (range: DateRange | undefined) => void
}

export function DateRangePicker({ dateRange, onDateRangeChange }: DateRangePickerProps) {
	const [open, setOpen] = useState(false)
	const [range, setRange] = useState<DateRange | undefined>(dateRange)

	function handleSelect(selectedRange: DateRange | undefined): void {
		setRange(selectedRange)
		onDateRangeChange?.(selectedRange)
		if (selectedRange?.from && selectedRange?.to) {
			setOpen(false)
		}
	}

	function formatDate(date: Date | undefined): string {
		if (!date) {
			return ''
		}
		return date.toLocaleDateString('en-US', {
			month: '2-digit',
			day: '2-digit',
			year: 'numeric'
		})
	}

	return (
		<Popover
			open={open}
			onOpenChange={setOpen}
		>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					className='h-10 w-full justify-start border-slate-300 bg-white text-left font-normal hover:bg-slate-50'
				>
					<CalendarIcon className='mr-2 size-4 text-slate-400' />
					{range?.from ? (
						range.to ? (
							<>
								{formatDate(range.from)} - {formatDate(range.to)}
							</>
						) : (
							formatDate(range.from)
						)
					) : (
						<span className='text-slate-500'>Pick a date range</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className='w-auto p-0'
				align='start'
			>
				<Calendar
					mode='range'
					defaultMonth={range?.from}
					selected={range}
					onSelect={handleSelect}
					numberOfMonths={2}
					className='rounded-lg'
				/>
			</PopoverContent>
		</Popover>
	)
}
