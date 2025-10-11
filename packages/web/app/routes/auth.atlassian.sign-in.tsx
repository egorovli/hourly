import type { Route } from './+types/auth.atlassian.sign-in.ts'

import { authenticator } from '../lib/auth/index.server.js'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function loader({ request, context }: Route.LoaderArgs) {
	return authenticator.authenticate('atlassian', request)
}
