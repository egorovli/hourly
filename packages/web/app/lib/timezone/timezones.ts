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
const GROUP_ORDER = [
	'System',
	'Quick Access',
	'Americas',
	'Europe',
	'Asia',
	'Pacific',
	'Africa',
	'Antarctica'
]

const QUICK_ACCESS_GROUP = 'Quick Access'
const UTC_TIMEZONE = 'Etc/UTC'

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
 * Creates a timezone option with formatted offset label.
 */
function createTimezoneOption(
	tzName: string,
	customLabel?: string,
	group?: string
): TimezoneOption | undefined {
	const tz = rawTimeZones.find(t => t.name === tzName)
	if (!tz) {
		return undefined
	}

	const city = customLabel ?? tz.mainCities[0] ?? tz.name.split('/').pop()?.replace(/_/g, ' ')
	const offset = formatOffset(tz.rawOffsetInMinutes)
	const label = `(${offset}) ${city}`

	return {
		value: tz.name,
		label,
		group: group ?? CONTINENT_GROUPS[tz.continentCode] ?? 'Other'
	}
}

/**
 * Returns a curated list of timezone options grouped by region.
 * System timezone is always first.
 * When quickAccessTimezones is provided, adds a Quick Access group with those timezones plus UTC.
 */
export function getTimezoneOptions(quickAccessTimezones?: string[]): TimezoneGroup[] {
	const groupedOptions = new Map<string, TimezoneOption[]>()

	// Add system option first
	groupedOptions.set('System', [
		{
			value: SYSTEM_TIMEZONE_VALUE,
			label: 'System (Browser Default)',
			group: 'System'
		}
	])

	// Add Quick Access group if timezones are provided
	if (quickAccessTimezones && quickAccessTimezones.length > 0) {
		const quickAccessOptions: TimezoneOption[] = []
		const addedTimezones = new Set<string>()

		// Add provided timezones (deduplicated)
		for (const tz of quickAccessTimezones) {
			if (!addedTimezones.has(tz)) {
				const tzOption = createTimezoneOption(tz, undefined, QUICK_ACCESS_GROUP)
				if (tzOption) {
					quickAccessOptions.push(tzOption)
					addedTimezones.add(tz)
				}
			}
		}

		// Add UTC if not already included
		if (!addedTimezones.has(UTC_TIMEZONE)) {
			const utcOption = createTimezoneOption(UTC_TIMEZONE, 'UTC', QUICK_ACCESS_GROUP)
			if (utcOption) {
				quickAccessOptions.push(utcOption)
			}
		}

		// Sort by UTC offset
		quickAccessOptions.sort((a, b) => {
			const tzA = rawTimeZones.find(tz => tz.name === a.value)
			const tzB = rawTimeZones.find(tz => tz.name === b.value)
			return (tzA?.rawOffsetInMinutes ?? 0) - (tzB?.rawOffsetInMinutes ?? 0)
		})

		if (quickAccessOptions.length > 0) {
			groupedOptions.set(QUICK_ACCESS_GROUP, quickAccessOptions)
		}
	}

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
	// (except System and Quick Access groups which have fixed order)
	for (const [group, options] of groupedOptions) {
		if (group !== 'System' && group !== QUICK_ACCESS_GROUP) {
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
export function getAllTimezoneOptions(quickAccessTimezones?: string[]): TimezoneOption[] {
	return getTimezoneOptions(quickAccessTimezones).flatMap(group => group.options)
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
