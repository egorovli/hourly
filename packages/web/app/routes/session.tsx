/** biome-ignore-all lint/style/noProcessEnv: Dev-only route gating is acceptable here */

import type { Route } from './+types/session.ts'

import { redirect } from 'react-router'

import * as cookies from '~/lib/cookies/index.ts'
import { orm, Session, withRequestContext } from '~/lib/mikro-orm/index.ts'

export const loader = withRequestContext(async function loader({ request }: Route.LoaderArgs) {
	if (!import.meta.env.DEV) {
		throw new Response('Not found', { status: 404 })
	}

	const now = new Date()

	// Find the first active (non-expired) session
	// Sessions are active if expiresAt is null or expiresAt is in the future
	const session = await orm.em.findOne(
		Session,
		{
			$or: [
				{
					expiresAt: null
				},
				{
					expiresAt: {
						$gt: now
					}
				}
			]
		},
		{
			orderBy: {
				createdAt: 'DESC'
			}
		}
	)

	if (!session) {
		throw new Response('No active session found', { status: 404 })
	}

	// Serialize the session ID directly into a Set-Cookie header
	// This hijacks the existing session by setting the cookie to contain that session ID
	const header = await cookies.session.serialize(session.id, {
		expires: session.expiresAt
	})

	const url = new URL(request.url)
	const redirectTo = url.searchParams.get('redirected-from') ?? '/'

	return redirect(redirectTo, {
		headers: {
			'Set-Cookie': header
		}
	})
})
