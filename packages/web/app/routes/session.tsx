/** biome-ignore-all lint/style/noProcessEnv: Dev-only route gating is acceptable here */

import type { Route } from './+types/session.ts'

export async function loader({ request }: Route.LoaderArgs) {
	if (!import.meta.env.DEV) {
		throw new Response('Not found', { status: 404 })
	}

	// TODO: Implement session hijacker handler
	throw new Error('Not implemented')
}
