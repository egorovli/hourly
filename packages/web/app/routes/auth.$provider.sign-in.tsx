import type { Route } from './+types/auth.$provider.sign-in.ts'

import { authenticator } from '~/lib/auth/index.ts'
import { withRequestContext } from '~/lib/mikro-orm/index.ts'

// TODO: check current session, etc
export const loader = withRequestContext(async function loader({
	request,
	params,
	...args
}: Route.LoaderArgs) {
	const strategy = authenticator.get(params.provider)

	if (!strategy) {
		throw new Error(`Strategy ${params.provider} not found`)
	}

	return authenticator.authenticate(strategy.name, request)
})
