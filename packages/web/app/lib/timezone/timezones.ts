import { rawTimeZones } from '@vvo/tzdb'

import { SYSTEM_TIMEZONE_VALUE } from './index.ts'

export interface TimezoneOption {
	value: string
	label: string
	group: string
}

export interface TimezoneGroup {
	group: string
	options: TimezoneOption[]
}

/**
 * Maps continent codes to display group names.
 */
const CONTINENT_GROUPS: Record<string, string> = {
	AF: 'Africa',
	AN: 'Antarctica',
	AS: 'Asia',
	EU: 'Europe',
	NA: 'Americas',
	OC: 'Pacific',
	SA: 'Americas'
}

/**
 * Group display order.
 */
const GROUP_ORDER = ['System', 'Americas', 'Europe', 'Asia', 'Pacific', 'Africa', 'Antarctica']

/**
 * Formats offset in minutes to UTC string (e.g., "UTC-05:00").
 */
function formatOffset(offsetInMinutes: number): string {
	const sign = offsetInMinutes >= 0 ? '+' : '-'
	const absOffset = Math.abs(offsetInMinutes)
	const hours = Math.floor(absOffset / 60)
	const minutes = absOffset % 60
	return `UTC${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/**
 * Returns a curated list of timezone options grouped by region.
 * System timezone is always first.
 */
export function getTimezoneOptions(): TimezoneGroup[] {
	const groupedOptions = new Map<string, TimezoneOption[]>()

	// Add system option first
	groupedOptions.set('System', [
		{
			value: SYSTEM_TIMEZONE_VALUE,
			label: 'System (Browser Default)',
			group: 'System'
		}
	])

	// Process raw timezones
	for (const tz of rawTimeZones) {
		const group = CONTINENT_GROUPS[tz.continentCode] ?? 'Other'

		// Use the first main city for a cleaner label
		const city = tz.mainCities[0] ?? tz.name.split('/').pop()?.replace(/_/g, ' ')
		const offset = formatOffset(tz.rawOffsetInMinutes)
		const label = `(${offset}) ${city}`

		const option: TimezoneOption = {
			value: tz.name,
			label,
			group
		}

		const existing = groupedOptions.get(group) ?? []
		existing.push(option)
		groupedOptions.set(group, existing)
	}

	// Sort options within each group by offset then by label
	for (const [group, options] of groupedOptions) {
		if (group !== 'System') {
			options.sort((a, b) => {
				// Extract offset for sorting
				const offsetA = a.label.match(/\(UTC([+-]\d{2}:\d{2})\)/)?.[1] ?? ''
				const offsetB = b.label.match(/\(UTC([+-]\d{2}:\d{2})\)/)?.[1] ?? ''
				const offsetCompare = offsetA.localeCompare(offsetB)
				if (offsetCompare !== 0) {
					return offsetCompare
				}
				return a.label.localeCompare(b.label)
			})
		}
	}

	// Return groups in preferred order
	const result: TimezoneGroup[] = []
	for (const groupName of GROUP_ORDER) {
		const options = groupedOptions.get(groupName)
		if (options && options.length > 0) {
			result.push({ group: groupName, options })
		}
	}

	// Add any remaining groups not in the preferred order
	for (const [groupName, options] of groupedOptions) {
		if (!GROUP_ORDER.includes(groupName) && options.length > 0) {
			result.push({ group: groupName, options })
		}
	}

	return result
}

/**
 * Flattened list of all timezone options for search.
 */
export function getAllTimezoneOptions(): TimezoneOption[] {
	return getTimezoneOptions().flatMap(group => group.options)
}

/**
 * Finds a timezone option by value.
 */
export function findTimezoneOption(value: string | undefined): TimezoneOption | undefined {
	if (!value) {
		return undefined
	}
	return getAllTimezoneOptions().find(opt => opt.value === value)
}
