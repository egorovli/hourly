import type { Theme } from './theme.enum.ts'

export type CalendarCompactMode = 'standard' | 'comfortable' | 'compact'

export interface Preferences {
	theme?: Theme
	locale?: string
	timezone?: string
	weekStartsOn?: number
	workingDayStartTime?: string
	workingDayEndTime?: string
	minimumDurationMinutes?: number
	calendarCompactMode?: CalendarCompactMode
}
