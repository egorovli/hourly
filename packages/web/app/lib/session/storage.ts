import type { FlashSessionData } from 'react-router'

import { createSessionStorage } from 'react-router'

import { session } from '../cookies/session.ts'
import { orm, Session } from '../mikro-orm/index.ts'

export interface SessionData {
	user?: {
		oauth?: Record<string, string>
	}
}

export interface FlashData {
	error: string
	foo: string
}

export const sessionStorage = createSessionStorage<SessionData, FlashData>({
	cookie: session,

	async createData(data, expires): Promise<string> {
		const em = orm.em.fork()

		const session = new Session()
		session.data = data
		session.expiresAt = expires

		await em.persist(session).flush()
		return session.id
	},

	async readData(id): Promise<FlashSessionData<SessionData, FlashData> | null> {
		const em = orm.em.fork()
		const session = await em.findOne(Session, { id }, { populate: ['profiles'] })

		if (!session) {
			return null
		}

		if (session.expiresAt && session.expiresAt < new Date()) {
			await em.remove(session).flush()
			return null
		}

		// Ensure profiles are loaded
		await session.profiles.loadItems()

		return session.data
	},

	async updateData(id, data, expires): Promise<void> {
		const em = orm.em.fork()
		const session = await em.findOne(Session, { id })

		if (session) {
			session.data = data
			session.expiresAt = expires
			await em.flush()
		}
	},

	async deleteData(id): Promise<void> {
		const em = orm.em.fork()
		const session = await em.findOne(Session, { id })

		if (session) {
			await em.remove(session).flush()
		}
	}
})

export const { getSession, commitSession, destroySession } = sessionStorage
