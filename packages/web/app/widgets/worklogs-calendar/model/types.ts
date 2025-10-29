import type { WorklogCalendarEvent } from '~/entities/index.ts'

/**
 * Represents a change made to a calendar event
 */
export interface EventChange {
	eventId: string
	originalEvent: WorklogCalendarEvent | null
	modifiedEvent: WorklogCalendarEvent
	changeType: 'resize' | 'move' | 'create' | 'delete'
	timestamp: number
}

/**
 * Summary of all changes made to events
 */
export interface EventChangesSummary {
	hasChanges: boolean
	totalChanges: number
	changes: Map<string, EventChange>
}
