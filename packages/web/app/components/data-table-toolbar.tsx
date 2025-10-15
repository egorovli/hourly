import { X } from 'lucide-react'

import { Button } from '~/components/shadcn/ui/button.tsx'
import { Input } from '~/components/shadcn/ui/input.tsx'
import { Filter, type FilterOption, type FilterGroup } from './data-table-faceted-filter.tsx'
import { DataTableDateRangeFilter } from './data-table-date-range-filter.tsx'

export interface FilterConfig {
	id: string
	title: string
	options: FilterOption[]
	groups?: FilterGroup[]
}

interface DataTableToolbarProps {
	searchValue?: string
	onSearchChange?: (value: string) => void
	searchPlaceholder?: string
	filters?: FilterConfig[]
	selectedFilters?: Record<string, Set<string>>
	onFilterChange?: (filterId: string, values: Set<string>) => void
	dateRange?: { from: Date | undefined; to: Date | undefined }
	onDateRangeChange?: (range: { from: Date | undefined; to: Date | undefined }) => void
	onReset?: () => void
}

export function DataTableToolbar({
	searchValue,
	onSearchChange,
	searchPlaceholder = 'Filter...',
	filters = [],
	selectedFilters = {},
	onFilterChange,
	dateRange,
	onDateRangeChange,
	onReset
}: DataTableToolbarProps) {
	const isFiltered =
		(searchValue && searchValue.length > 0) ||
		Object.values(selectedFilters).some(values => values.size > 0) ||
		(dateRange && (dateRange.from || dateRange.to))

	return (
		<div className='flex flex-col gap-3 grow justify-start items-stretch'>
			{onSearchChange && (
				<div className='flex items-start justify-start'>
					<Input
						placeholder={searchPlaceholder}
						value={searchValue ?? ''}
						onChange={e => onSearchChange(e.target.value)}
					/>
				</div>
			)}

			<div className='flex items-start justify-start flex-wrap gap-2'>
				{dateRange && onDateRangeChange && (
					<DataTableDateRangeFilter
						dateRange={dateRange}
						onSelect={onDateRangeChange}
					/>
				)}

				{filters.map(filter => (
					<Filter
						key={filter.id}
						title={filter.title}
						options={filter.options}
						groups={filter.groups}
						selectedValues={selectedFilters[filter.id] ?? new Set()}
						onSelect={values => onFilterChange?.(filter.id, values)}
					/>
				))}

				{isFiltered && onReset && (
					<Button
						variant='ghost'
						onClick={onReset}
						className='h-8 px-2 lg:px-3'
					>
						Reset
						<X className='ml-2 h-4 w-4' />
					</Button>
				)}
			</div>
		</div>
	)
}
