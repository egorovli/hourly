import type { UserPreferences } from '~/lib/cookies/preferences.ts'
import type { Route } from './+types/preferences.ts'

import { data } from 'react-router'

import { auditActions } from '~/lib/audit/actions.ts'
import { getAuditLogger, withAuditContext } from '~/lib/audit/middleware.ts'
import { requireAuth } from '~/lib/auth/require-auth.ts'
import { preferences } from '~/lib/cookies/preferences.ts'
import { isValidTimezone } from '~/lib/timezone/index.ts'

export const action = withAuditContext(async function action({ request }: Route.ActionArgs) {
	const auditLogger = getAuditLogger()

	// Try to authenticate to set actor for audit logging
	// Preferences can be changed without being logged in, but if logged in we track who made the change
	try {
		await requireAuth(request)
	} catch {
		// User not authenticated - continue without actor (will be logged as anonymous)
	}

	const formData = await request.formData()
	const timezone = formData.get('timezone')

	if (typeof timezone !== 'string' || !isValidTimezone(timezone)) {
		auditLogger?.log(auditActions.preferences.updateFailed('timezone', 'Invalid timezone value'))
		return data({ success: false, error: 'Invalid timezone' }, { status: 400 })
	}

	// Parse existing preferences from cookie
	const existingPrefs =
		((await preferences.parse(request.headers.get('Cookie'))) as UserPreferences | null) ?? {}

	const previousTimezone = existingPrefs.timezone

	// Update with new timezone
	const updatedPrefs: UserPreferences = {
		...existingPrefs,
		timezone
	}

	auditLogger?.log(
		auditActions.preferences.updated(['timezone'], {
			timezone: { from: previousTimezone, to: timezone }
		})
	)

	return data(
		{ success: true },
		{
			headers: {
				'Set-Cookie': await preferences.serialize(updatedPrefs)
			}
		}
	)
})
