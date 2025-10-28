import type { WorklogCalendarEvent } from '~/entities/index.ts'

export interface EventContextMenuActions {
	onEdit: (event: WorklogCalendarEvent) => void
	onDelete: (event: WorklogCalendarEvent) => void
}

export interface SlotContextMenuActions {
	onCreate: (slotInfo: { start: Date; end: Date }) => void
}
