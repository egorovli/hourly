import { useCallback, useState } from 'react'
import { DateTime } from 'luxon'
import type { WorklogCalendarEvent } from '~/entities/index.ts'
import type { EventDialogMode, EventFormData } from './types.ts'

export function useEventForm(mode: EventDialogMode, event?: WorklogCalendarEvent) {
	const [formData, setFormData] = useState<EventFormData>(() => {
		if (mode === 'edit' && event) {
			// Format existing event data
			const start = DateTime.fromJSDate(event.start)
			const end = DateTime.fromJSDate(event.end)

			return {
				issueKey: event.resource.issueKey,
				startDate: start.toISODate() ?? '',
				startTime: start.toFormat('HH:mm'),
				endDate: end.toISODate() ?? '',
				endTime: end.toFormat('HH:mm'),
				description: event.resource.issueSummary || ''
			}
		}

		// Default values for new event
		const now = DateTime.now()
		const later = now.plus({ hours: 1 })

		return {
			issueKey: '',
			startDate: now.toISODate() ?? '',
			startTime: now.toFormat('HH:mm'),
			endDate: later.toISODate() ?? '',
			endTime: later.toFormat('HH:mm'),
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
		const now = DateTime.now()
		const later = now.plus({ hours: 1 })

		setFormData({
			issueKey: '',
			startDate: now.toISODate() ?? '',
			startTime: now.toFormat('HH:mm'),
			endDate: later.toISODate() ?? '',
			endTime: later.toFormat('HH:mm'),
			description: ''
		})
	}, [])

	return {
		formData,
		updateField,
		resetForm
	}
}
