/** biome-ignore-all lint/style/noProcessEnv: We need to access secrets */

import { createCookie } from 'react-router'

import { secrets } from './common.ts'

export const session = createCookie('session', {
	httpOnly: true,
	sameSite: 'lax',

	secrets,
	secure: process.env.SESSION_SECURE === 'true'
})
