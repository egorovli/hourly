import type { Route } from './+types/auth.sign-out.ts'

import { authenticator } from '../lib/auth/index.server.js'

export async function loader({ request }: Route.LoaderArgs) {
	// await authenticator.isAuthenticated(request, {
	// 	failureRedirect: '/'
	// })

	// await authenticator.logout(request, {
	// 	redirectTo: '/'
	// })

	return {}
}
