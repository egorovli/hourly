import type { DateRange } from 'react-day-picker'

export type { DateRange }

export interface DateRangeFilterProps {
	value?: DateRange
	onChange: (value: DateRange | undefined) => void
}
