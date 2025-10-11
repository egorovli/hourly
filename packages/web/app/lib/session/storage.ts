import type { User } from '../auth/index.server.ts'

import { createCookieSessionStorage } from 'react-router'

import { session } from '../cookies/session.ts'

export interface SessionData {
	user: User
}

export interface SessionFlashData {
	error: string
}

export const sessionStorage = createCookieSessionStorage<SessionData, SessionFlashData>({
	cookie: session
})

export const { getSession, commitSession, destroySession } = sessionStorage
