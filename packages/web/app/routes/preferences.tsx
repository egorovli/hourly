import type { UserPreferences } from '~/lib/cookies/preferences.ts'
import type { Route } from './+types/preferences.ts'

import { data } from 'react-router'

import { preferences } from '~/lib/cookies/preferences.ts'
import { isValidTimezone } from '~/lib/timezone/index.ts'

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const timezone = formData.get('timezone')

	if (typeof timezone !== 'string' || !isValidTimezone(timezone)) {
		return data({ success: false, error: 'Invalid timezone' }, { status: 400 })
	}

	// Parse existing preferences from cookie
	const existingPrefs =
		((await preferences.parse(request.headers.get('Cookie'))) as UserPreferences | null) ?? {}

	// Update with new timezone
	const updatedPrefs: UserPreferences = {
		...existingPrefs,
		timezone
	}

	return data(
		{ success: true },
		{
			headers: {
				'Set-Cookie': await preferences.serialize(updatedPrefs)
			}
		}
	)
}
