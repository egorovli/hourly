import type { WorklogCalendarEvent } from '~/entities/index.ts'

export type EventDialogMode = 'create' | 'edit'

export interface EventFormData {
	issueKey: string
	startDate: string
	startTime: string
	endDate: string
	endTime: string
	description: string
}

export interface EventDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	mode: EventDialogMode
	event?: WorklogCalendarEvent
	onSave: (data: EventFormData) => void
}
