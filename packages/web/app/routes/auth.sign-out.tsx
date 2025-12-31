import type { Route } from './+types/auth.sign-out.ts'

import { withRequestContext } from '~/lib/mikro-orm/index.ts'

export const action = withRequestContext(async function action({ request }: Route.ActionArgs) {
	// TODO: Implement preferences update handler
	throw new Error('Not implemented')
})
