import type { CalendarEvent } from './types.ts'

import { useMemo, useState } from 'react'
import { RiCalendarCheckLine } from '@remixicon/react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import { addWeeks, endOfWeek, format, isSameMonth, startOfWeek, subWeeks } from 'date-fns'

import { EventGap, EventHeight, WeekCellsHeight } from './constants.ts'
import { WeekView } from './week-view.tsx'
import { cn } from './utils.ts'

import { Button } from '~/components/shadcn/ui/button.tsx'

export interface EventCalendarProps {
	events?: CalendarEvent[]
	className?: string
}

export function EventCalendar({ events = [], className }: EventCalendarProps) {
	const [currentDate, setCurrentDate] = useState(new Date())

	const handlePrevious = () => {
		setCurrentDate(subWeeks(currentDate, 1))
	}

	const handleNext = () => {
		setCurrentDate(addWeeks(currentDate, 1))
	}

	const handleToday = () => {
		setCurrentDate(new Date())
	}

	const viewTitle = useMemo(() => {
		const start = startOfWeek(currentDate, { weekStartsOn: 0 })
		const end = endOfWeek(currentDate, { weekStartsOn: 0 })
		if (isSameMonth(start, end)) {
			return format(start, 'MMMM yyyy')
		}
		return `${format(start, 'MMM')} - ${format(end, 'MMM yyyy')}`
	}, [currentDate])

	return (
		<div
			className='flex flex-col rounded-lg border'
			style={
				{
					'--event-height': `${EventHeight}px`,
					'--event-gap': `${EventGap}px`,
					'--week-cells-height': `${WeekCellsHeight}px`
				} as React.CSSProperties
			}
		>
			<div className={cn('flex items-center justify-between p-2 sm:p-4', className)}>
				<div className='flex items-center gap-1 sm:gap-4'>
					<Button
						variant='outline'
						className='max-[479px]:aspect-square max-[479px]:p-0!'
						onClick={handleToday}
					>
						<RiCalendarCheckLine
							className='min-[480px]:hidden'
							size={16}
							aria-hidden='true'
						/>
						<span className='max-[479px]:sr-only'>Today</span>
					</Button>
					<div className='flex items-center sm:gap-2'>
						<Button
							variant='ghost'
							size='icon'
							onClick={handlePrevious}
							aria-label='Previous'
						>
							<ChevronLeftIcon
								size={16}
								aria-hidden='true'
							/>
						</Button>
						<Button
							variant='ghost'
							size='icon'
							onClick={handleNext}
							aria-label='Next'
						>
							<ChevronRightIcon
								size={16}
								aria-hidden='true'
							/>
						</Button>
					</div>
					<h2 className='text-sm font-semibold sm:text-lg md:text-xl'>{viewTitle}</h2>
				</div>
			</div>

			<div className='flex flex-1 flex-col'>
				<WeekView
					currentDate={currentDate}
					events={events}
				/>
			</div>
		</div>
	)
}
