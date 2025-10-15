/** biome-ignore-all lint/style/noProcessEnv: Dev-only route gating is acceptable here */
import { redirect } from 'react-router'
import type { Route } from './+types/dev.hijack-session.ts'

import { orm } from '~/lib/mikro-orm/index.ts'
import { Session as SessionEntity } from '~/lib/mikro-orm/entities/session.ts'
import { session as sessionCookie } from '~/lib/cookies/session.ts'

export async function loader({ request }: Route.LoaderArgs) {
	if (!import.meta.env.DEV) {
		throw new Response('Not found', { status: 404 })
	}

	const em = orm.em.fork()

	// Try to find a fully authenticated session first (both providers connected)
	const candidates = await em.find(
		SessionEntity,
		{},
		{
			orderBy: { updatedAt: 'DESC' },
			limit: 25
		}
	)

	const target = candidates.find(s => {
		const data = (s.data ?? {}) as Record<string, unknown>
		const user = data['user'] as Record<string, unknown> | undefined
		return Boolean(user && (user as any).atlassian && (user as any).gitlab)
	})

	if (!target) {
		throw new Response('No fully authenticated session found to hijack', { status: 404 })
	}

	return redirect('/', {
		headers: {
			'Set-Cookie': await sessionCookie.serialize(target.id)
		}
	})
}
