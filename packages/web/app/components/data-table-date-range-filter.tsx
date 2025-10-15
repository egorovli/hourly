import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '~/components/shadcn/ui/button.tsx'
import { Calendar } from '~/components/shadcn/ui/calendar.tsx'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/shadcn/ui/popover.tsx'
import { cn } from '~/lib/util/index.ts'

interface DataTableDateRangeFilterProps {
	dateRange: { from: Date | undefined; to: Date | undefined }
	onSelect: (range: { from: Date | undefined; to: Date | undefined }) => void
}

export function DataTableDateRangeFilter({ dateRange, onSelect }: DataTableDateRangeFilterProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					size='sm'
					className={cn('h-8 border-dashed', !dateRange.from && 'text-muted-foreground')}
				>
					<CalendarIcon className='mr-2 h-4 w-4' />
					{dateRange.from ? (
						dateRange.to ? (
							<>
								{format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
							</>
						) : (
							format(dateRange.from, 'LLL dd, y')
						)
					) : (
						<span>Date range</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className='w-auto p-0'
				align='start'
			>
				<Calendar
					mode='range'
					defaultMonth={dateRange.from}
					selected={{ from: dateRange.from, to: dateRange.to }}
					onSelect={range => onSelect({ from: range?.from, to: range?.to })}
					numberOfMonths={2}
					showOutsideDays={false}
				/>
			</PopoverContent>
		</Popover>
	)
}
