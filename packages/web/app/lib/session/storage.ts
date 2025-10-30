import { createSessionStorage } from 'react-router'

import { session } from '../cookies/session.ts'
import { Session } from '../mikro-orm/entities/session.ts'
import { orm } from '../mikro-orm/index.ts'

export interface ProviderAuth {
	id: string
	displayName: string
	email?: string
	tokenExpiresAt?: string
	avatarUrl?: string
	hasRefreshToken?: boolean
	baseUrl?: string
}

export interface SessionUser {
	atlassian?: ProviderAuth
	gitlab?: ProviderAuth
}

export interface SessionData {
	'user'?: SessionUser
	'redirected-from'?: string
}

export interface SessionFlashData {
	error: string
}

export const sessionStorage = createSessionStorage<SessionData, SessionFlashData>({
	cookie: session,

	async createData(data, expires) {
		const em = orm.em.fork()

		const session = new Session()
		session.data = data as Record<string, unknown>
		session.expiresAt = expires

		await em.persist(session).flush()
		return session.id
	},

	async readData(id) {
		const em = orm.em.fork()
		const session = await em.findOne(Session, { id })

		if (!session) {
			return null
		}

		if (session.expiresAt && session.expiresAt < new Date()) {
			await em.remove(session).flush()
			return null
		}

		return session.data as SessionData
	},

	async updateData(id, data, expires) {
		const em = orm.em.fork()
		const session = await em.findOne(Session, { id })

		if (session) {
			session.data = data as Record<string, unknown>
			session.expiresAt = expires
			await em.flush()
		}
	},

	async deleteData(id) {
		const em = orm.em.fork()
		const session = await em.findOne(Session, { id })

		if (session) {
			await em.remove(session).flush()
		}
	}
})

export const { getSession, commitSession, destroySession } = sessionStorage
