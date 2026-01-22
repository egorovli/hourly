/** biome-ignore-all lint/style/noProcessEnv: We need to access environment variables */
import { createCookie } from 'react-router'

import { secrets } from './common.ts'

export interface UserPreferences {
	timezone?: string
}

export const preferences = createCookie('preferences', {
	maxAge: 60 * 60 * 24 * 365, // 1 year
	sameSite: 'lax',
	secrets,
	secure: process.env.SESSION_SECURE === 'true'
})
