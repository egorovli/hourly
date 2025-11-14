import type { Theme } from './theme.enum.ts'

export interface Preferences {
	theme?: Theme
	locale?: string
	// POC-only properties for sidebar settings dialog
	timezone?: string
	weekStartsOn?: number
	workingDayStartTime?: string
	workingDayEndTime?: string
	minimumDurationMinutes?: number
}
