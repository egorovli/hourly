/** biome-ignore-all lint/style/noProcessEnv: Dev-only route gating is acceptable here */

import type { Route } from './+types/session.ts'

import { redirect } from 'react-router'

import * as cookies from '~/lib/cookies/index.ts'
import { Session } from '~/lib/mikro-orm/entities/session.ts'
import { orm } from '~/lib/mikro-orm/index.ts'

export async function loader({ request }: Route.LoaderArgs) {
	if (!import.meta.env.DEV) {
		throw new Response('Not found', { status: 404 })
	}

	const em = orm.em.fork()

	// Prefer the most recently updated session with both providers connected
	const target = await em.findOne(
		Session,
		{
			data: {
				user: {
					atlassian: { $ne: null },
					gitlab: { $ne: null }
				}
			}
		},
		{
			orderBy: { updatedAt: 'DESC' }
		}
	)

	if (!target) {
		throw new Response('No fully authenticated session found to hijack', { status: 404 })
	}

	return redirect('/', {
		headers: {
			'Set-Cookie': await cookies.session.serialize(target.id)
		}
	})
}
