import type { EntityManager } from '@mikro-orm/core'
import type { FlashSessionData } from 'react-router'

import { RequestContext } from '@mikro-orm/core'
import { createSessionStorage as createReactRouterSessionStorage } from 'react-router'

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

export interface CreateSessionStorageOptions {
	em?: EntityManager
}

export function createSessionStorage(options?: CreateSessionStorageOptions) {
	const getEntityManager = () => options?.em ?? RequestContext.getEntityManager() ?? orm.em.fork()

	return createReactRouterSessionStorage<SessionData, FlashData>({
		cookie: session,

		async createData(data, expires): Promise<string> {
			const em = getEntityManager()

			const session = new Session()
			session.data = data
			session.expiresAt = expires

			await em.persist(session).flush()
			return session.id
		},

		async readData(id): Promise<FlashSessionData<SessionData, FlashData> | null> {
			const em = getEntityManager()
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
			const em = getEntityManager()
			const session = await em.findOne(Session, { id })

			if (session) {
				session.data = data
				session.expiresAt = expires
				await em.flush()
			}
		},

		async deleteData(id): Promise<void> {
			const em = getEntityManager()
			const session = await em.findOne(Session, { id })

			if (session) {
				await em.remove(session).flush()
			}
		}
	})
}

export const sessionStorage = createSessionStorage()
export const { getSession, commitSession, destroySession } = sessionStorage
