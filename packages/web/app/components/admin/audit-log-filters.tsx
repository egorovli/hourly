import type { AuditLogQueryParams, AuditLogViewMode, ResolvedActor } from '~/domain/index.ts'
import type { DateRange } from 'react-day-picker'

import { DateTime } from 'luxon'
import { CalendarIcon, XIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import { AuditLogActorFilter } from '~/components/admin/audit-log-actor-filter.tsx'
import { AuditLogThresholdSelect } from '~/components/admin/audit-log-threshold-select.tsx'
import { AuditLogViewToggle } from '~/components/admin/audit-log-view-toggle.tsx'
import { Button } from '~/components/shadcn/ui/button.tsx'
import { Calendar } from '~/components/shadcn/ui/calendar.tsx'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/shadcn/ui/popover.tsx'
import { FacetedFilter } from '~/components/ui/faceted-filter.tsx'
import {
	AuditLogActionType,
	AuditLogOutcome,
	AuditLogSeverity,
	AuditLogTargetResourceType
} from '~/domain/index.ts'
import { cn } from '~/lib/util/index.ts'

const actionTypeOptions = Object.entries(AuditLogActionType).map(([key, value]) => ({
	label: key.replace(/([A-Z])/g, ' $1').trim(),
	value
}))

const outcomeOptions = Object.entries(AuditLogOutcome).map(([key, value]) => ({
	label: key,
	value
}))

const severityOptions = Object.entries(AuditLogSeverity).map(([key, value]) => ({
	label: key,
	value
}))

const targetResourceTypeOptions = Object.entries(AuditLogTargetResourceType).map(
	([key, value]) => ({
		label: key.replace(/([A-Z])/g, ' $1').trim(),
		value
	})
)

function formatDateRange(range: DateRange | undefined): string {
	if (!range?.from) {
		return 'Select date range'
	}

	const from = DateTime.fromJSDate(range.from)

	if (!range.to) {
		return from.toFormat('LLL dd, yyyy')
	}

	const to = DateTime.fromJSDate(range.to)

	// If same year, show abbreviated format
	if (from.year === to.year) {
		return `${from.toFormat('LLL dd')} - ${to.toFormat('LLL dd, yyyy')}`
	}

	return `${from.toFormat('LLL dd, yyyy')} - ${to.toFormat('LLL dd, yyyy')}`
}

/**
 * Parse date from URL params. Handles both ISO strings and plain dates.
 */
function parseDateParam(param: string | undefined): Date | undefined {
	if (!param) {
		return undefined
	}

	const dt = DateTime.fromISO(param)

	if (dt.isValid) {
		return dt.toJSDate()
	}

	return undefined
}

export interface AuditLogFiltersProps {
	params: AuditLogQueryParams
	viewMode: AuditLogViewMode
	allActors: Record<string, ResolvedActor>
	threshold?: number
}

export function AuditLogFilters({
	params,
	viewMode,
	allActors,
	threshold
}: AuditLogFiltersProps): React.ReactNode {
	const [searchParams, setSearchParams] = useSearchParams()
	const [dateRange, setDateRange] = useState<DateRange | undefined>()

	// Sync date range state with URL params
	// This handles external URL changes (back/forward navigation, direct URL entry)
	useEffect(() => {
		const from = parseDateParam(params['filter[from]'])
		const to = parseDateParam(params['filter[to]'])

		if (!from && !to) {
			setDateRange(undefined)
		} else {
			setDateRange({ from, to })
		}
	}, [params['filter[from]'], params['filter[to]']])

	function updateDateRange(range: DateRange | undefined): void {
		setDateRange(range)

		const newParams = new URLSearchParams(searchParams)

		// Remove existing date filters
		newParams.delete('filter[from]')
		newParams.delete('filter[to]')

		// Add new date filters if range is set
		// Use Luxon to properly handle dates and convert to UTC ISO
		if (range?.from) {
			const fromDt = DateTime.fromJSDate(range.from).startOf('day')
			const fromIso = fromDt.toUTC().toISO() ?? fromDt.toISO()
			if (fromIso) {
				newParams.set('filter[from]', fromIso)
			}
		}

		if (range?.to) {
			const toDt = DateTime.fromJSDate(range.to).endOf('day')
			const toIso = toDt.toUTC().toISO() ?? toDt.toISO()
			if (toIso) {
				newParams.set('filter[to]', toIso)
			}
		}

		// Reset to page 1 when filters change
		newParams.delete('page[number]')

		setSearchParams(newParams)
	}

	function updateArrayFilter(key: string, values: string[]): void {
		const newParams = new URLSearchParams(searchParams)

		// Remove all existing values for this key
		newParams.delete(key)

		// Add each selected value
		for (const value of values) {
			newParams.append(key, value)
		}

		// Reset to page 1 when filters change
		newParams.delete('page[number]')

		setSearchParams(newParams)
	}

	function clearFilters(): void {
		const newParams = new URLSearchParams()

		// Preserve page size if set
		const pageSize = searchParams.get('page[size]')
		if (pageSize) {
			newParams.set('page[size]', pageSize)
		}

		// Preserve view mode if set
		const viewModeParam = searchParams.get('view[mode]')
		if (viewModeParam) {
			newParams.set('view[mode]', viewModeParam)
		}

		setDateRange(undefined)
		setSearchParams(newParams)
	}

	const hasFilters =
		params['filter[action-type]'].length > 0 ||
		params['filter[outcome]'].length > 0 ||
		params['filter[severity]'].length > 0 ||
		params['filter[target-resource-type]'].length > 0 ||
		params['filter[actor]'].length > 0 ||
		params['filter[from]'] !== undefined ||
		params['filter[to]'] !== undefined

	return (
		<div className='flex items-end justify-between gap-4'>
			<div className='flex flex-wrap items-end gap-4'>
				<FacetedFilter
					title='Action Type'
					options={actionTypeOptions}
					selected={params['filter[action-type]']}
					onSelectionChange={values => updateArrayFilter('filter[action-type]', values)}
				/>

				<FacetedFilter
					title='Outcome'
					options={outcomeOptions}
					selected={params['filter[outcome]']}
					onSelectionChange={values => updateArrayFilter('filter[outcome]', values)}
				/>

				<FacetedFilter
					title='Severity'
					options={severityOptions}
					selected={params['filter[severity]']}
					onSelectionChange={values => updateArrayFilter('filter[severity]', values)}
				/>

				<FacetedFilter
					title='Target Resource'
					options={targetResourceTypeOptions}
					selected={params['filter[target-resource-type]']}
					onSelectionChange={values => updateArrayFilter('filter[target-resource-type]', values)}
				/>

				<AuditLogActorFilter
					actors={allActors}
					selected={params['filter[actor]']}
					onSelectionChange={values => updateArrayFilter('filter[actor]', values)}
				/>

				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant='outline'
							className={cn(
								'w-[280px] justify-start text-left font-normal',
								!dateRange && 'text-muted-foreground'
							)}
						>
							<CalendarIcon className='mr-2 size-4' />
							{formatDateRange(dateRange)}
						</Button>
					</PopoverTrigger>
					<PopoverContent
						className='w-auto p-0'
						align='start'
					>
						<Calendar
							mode='range'
							selected={dateRange}
							onSelect={updateDateRange}
							numberOfMonths={2}
						/>
					</PopoverContent>
				</Popover>

				{hasFilters && (
					<Button
						variant='ghost'
						size='sm'
						onClick={clearFilters}
						className='h-9'
					>
						<XIcon className='mr-1.5 size-4' />
						Clear filters
					</Button>
				)}
			</div>

			<div className='flex items-center gap-3'>
				{viewMode === 'activity' && threshold !== undefined && (
					<AuditLogThresholdSelect threshold={threshold} />
				)}
				<AuditLogViewToggle mode={viewMode} />
			</div>
		</div>
	)
}
