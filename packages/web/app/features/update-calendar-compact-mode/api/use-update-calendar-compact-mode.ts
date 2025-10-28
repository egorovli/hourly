import type { CalendarCompactMode } from '~/domain/preferences.ts'

import { useMutation } from '@tanstack/react-query'

export interface UpdateCalendarCompactModeRequest {
	calendarCompactMode: CalendarCompactMode
}

export function useUpdateCalendarCompactMode() {
	return useMutation<void, Error, UpdateCalendarCompactModeRequest>({
		mutationFn: async (request: UpdateCalendarCompactModeRequest) => {
			const formData = new FormData()
			formData.append('calendarCompactMode', request.calendarCompactMode)

			const response = await fetch('/preferences', {
				method: 'POST',
				body: formData
			})

			if (!response.ok) {
				throw new Error('Failed to update calendar compact mode')
			}
		},
		onSuccess: () => {
			// Reload the page to apply the new compact mode from the updated cookie
			window.location.reload()
		}
	})
}
