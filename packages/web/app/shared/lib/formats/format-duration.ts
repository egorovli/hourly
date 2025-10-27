/**
 * Format duration from seconds to human-readable string (e.g., "2h 30m", "45m")
 */
export function formatDurationFromSeconds(seconds?: number): string {
	if (!seconds || Number.isNaN(seconds)) {
		return '0m'
	}

	const minutesTotal = Math.max(1, Math.round(seconds / 60))
	if (minutesTotal < 60) {
		return `${minutesTotal}m`
	}

	const hours = Math.floor(minutesTotal / 60)
	const minutes = minutesTotal % 60

	if (minutes === 0) {
		return `${hours}h`
	}

	return `${hours}h ${minutes}m`
}
