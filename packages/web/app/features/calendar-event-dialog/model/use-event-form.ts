import { useCallback, useState } from 'react'
import type { WorklogCalendarEvent } from '~/entities/index.ts'
import type { EventDialogMode, EventFormData } from './types.ts'

export function useEventForm(mode: EventDialogMode, event?: WorklogCalendarEvent) {
	const [formData, setFormData] = useState<EventFormData>(() => {
		if (mode === 'edit' && event) {
			// Format existing event data
			const start = new Date(event.start)
			const end = new Date(event.end)

			return {
				issueKey: event.resource.issueKey,
				startDate: start.toISOString().split('T')[0] ?? '',
				startTime: start.toTimeString().slice(0, 5),
				endDate: end.toISOString().split('T')[0] ?? '',
				endTime: end.toTimeString().slice(0, 5),
				description: event.resource.issueSummary || ''
			}
		}

		// Default values for new event
		const now = new Date()
		const later = new Date(now.getTime() + 60 * 60 * 1000) // +1 hour

		return {
			issueKey: '',
			startDate: now.toISOString().split('T')[0] ?? '',
			startTime: now.toTimeString().slice(0, 5),
			endDate: later.toISOString().split('T')[0] ?? '',
			endTime: later.toTimeString().slice(0, 5),
			description: ''
		}
	})

	const updateField = useCallback(
		<K extends keyof EventFormData>(field: K, value: EventFormData[K]) => {
			setFormData(prev => ({ ...prev, [field]: value }))
		},
		[]
	)

	const resetForm = useCallback(() => {
		const now = new Date()
		const later = new Date(now.getTime() + 60 * 60 * 1000)

		setFormData({
			issueKey: '',
			startDate: now.toISOString().split('T')[0] ?? '',
			startTime: now.toTimeString().slice(0, 5),
			endDate: later.toISOString().split('T')[0] ?? '',
			endTime: later.toTimeString().slice(0, 5),
			description: ''
		})
	}, [])

	return {
		formData,
		updateField,
		resetForm
	}
}
