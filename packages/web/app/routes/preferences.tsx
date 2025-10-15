import type { Route } from './+types/preferences.js'
import type { Preferences } from '~/domain/preferences.js'

import z from 'zod'

import { Theme } from '~/domain/index.js'
import * as cookies from '~/lib/cookies/index.js'

const timeString = z
	.string()
	.regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
	.transform(v => v)
	.optional()

const schema = {
	payload: z
		.object({
			theme: z.enum(Theme).optional(),
			timezone: z.string().min(1).max(100).optional(),
			locale: z.string().min(2).max(10).optional(),
			weekStartsOn: z.coerce.number().int().min(0).max(6).optional(),
			workingDayStartTime: timeString,
			workingDayEndTime: timeString,
			minimumDurationMinutes: z.coerce.number().int().min(1).max(480).optional()
		})
		.refine(
			data => {
				if (!data.workingDayStartTime || !data.workingDayEndTime) {
					return true
				}
				const matchStart = data.workingDayStartTime.match(/^(\d{2}):(\d{2})$/)
				const matchEnd = data.workingDayEndTime.match(/^(\d{2}):(\d{2})$/)
				if (!matchStart || !matchEnd) {
					return false
				}
				const startMinutes = Number(matchStart[1]) * 60 + Number(matchStart[2])
				const endMinutes = Number(matchEnd[1]) * 60 + Number(matchEnd[2])
				return endMinutes > startMinutes
			},
			{ path: ['workingDayEndTime'], message: 'End time must be after start time' }
		)
}

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const input = Object.fromEntries(formData)

	const validation = {
		payload: await schema.payload.safeParseAsync(input)
	}

	if (!validation.payload.success) {
		return new Response(JSON.stringify(validation.payload.error.flatten()), {
			status: 422,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	const header = request.headers.get('Cookie')
	const preferences: Partial<Preferences> = (await cookies.preferences.parse(header)) ?? {}

	const data = validation.payload.data

	if (data.theme) {
		preferences.theme = data.theme
	}

	if (data.timezone) {
		preferences.timezone = data.timezone
	}

	if (data.locale) {
		preferences.locale = data.locale
	}

	if (typeof data.weekStartsOn === 'number') {
		preferences.weekStartsOn = data.weekStartsOn
	}

	if (data.workingDayStartTime) {
		preferences.workingDayStartTime = data.workingDayStartTime
	}

	if (data.workingDayEndTime) {
		preferences.workingDayEndTime = data.workingDayEndTime
	}

	if (typeof data.minimumDurationMinutes === 'number') {
		preferences.minimumDurationMinutes = data.minimumDurationMinutes
	}

	const response = new Response(null, {
		status: 204,
		headers: {
			'Set-Cookie': await cookies.preferences.serialize(preferences),
			'Vary': 'Cookie'
		}
	})

	return response
}
