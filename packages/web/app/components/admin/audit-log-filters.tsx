import type { AuditLogQueryParams } from '~/domain/index.ts'

import { useSearchParams } from 'react-router'
import { CalendarIcon, XIcon } from 'lucide-react'

import { Button } from '~/components/shadcn/ui/button.tsx'
import { Input } from '~/components/shadcn/ui/input.tsx'
import { Label } from '~/components/shadcn/ui/label.tsx'
import { FacetedFilter } from '~/components/ui/faceted-filter.tsx'
import { AuditLogActionType, AuditLogOutcome, AuditLogTargetResourceType } from '~/domain/index.ts'

const actionTypeOptions = Object.entries(AuditLogActionType).map(([key, value]) => ({
	label: key.replace(/([A-Z])/g, ' $1').trim(),
	value
}))

const outcomeOptions = Object.entries(AuditLogOutcome).map(([key, value]) => ({
	label: key,
	value
}))

const targetResourceTypeOptions = Object.entries(AuditLogTargetResourceType).map(
	([key, value]) => ({
		label: key.replace(/([A-Z])/g, ' $1').trim(),
		value
	})
)

export interface AuditLogFiltersProps {
	params: AuditLogQueryParams
}

export function AuditLogFilters({ params }: AuditLogFiltersProps): React.ReactNode {
	const [searchParams, setSearchParams] = useSearchParams()

	function updateFilter(key: string, value: string | undefined): void {
		const newParams = new URLSearchParams(searchParams)

		if (value === undefined || value === '') {
			newParams.delete(key)
		} else {
			newParams.set(key, value)
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

		// Preserve only page size if set
		const pageSize = searchParams.get('page[size]')
		if (pageSize) {
			newParams.set('page[size]', pageSize)
		}

		setSearchParams(newParams)
	}

	const hasFilters =
		params['filter[action-type]'].length > 0 ||
		params['filter[outcome]'].length > 0 ||
		params['filter[target-resource-type]'].length > 0 ||
		params['filter[from]'] !== undefined ||
		params['filter[to]'] !== undefined

	return (
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
				title='Target Resource'
				options={targetResourceTypeOptions}
				selected={params['filter[target-resource-type]']}
				onSelectionChange={values => updateArrayFilter('filter[target-resource-type]', values)}
			/>

			<div className='space-y-2'>
				<Label htmlFor='filter-from'>From</Label>
				<div className='relative'>
					<CalendarIcon className='absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
					<Input
						id='filter-from'
						type='datetime-local'
						className='w-52 pl-8'
						value={params['filter[from]']?.slice(0, 16) ?? ''}
						onChange={e => {
							const value = e.target.value
							updateFilter('filter[from]', value ? `${value}:00.000Z` : undefined)
						}}
					/>
				</div>
			</div>

			<div className='space-y-2'>
				<Label htmlFor='filter-to'>To</Label>
				<div className='relative'>
					<CalendarIcon className='absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
					<Input
						id='filter-to'
						type='datetime-local'
						className='w-52 pl-8'
						value={params['filter[to]']?.slice(0, 16) ?? ''}
						onChange={e => {
							const value = e.target.value
							updateFilter('filter[to]', value ? `${value}:00.000Z` : undefined)
						}}
					/>
				</div>
			</div>

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
	)
}
