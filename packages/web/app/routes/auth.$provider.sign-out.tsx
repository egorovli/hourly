import type { Route } from './+types/auth.$provider.sign-out.ts'

import { withRequestContext } from '~/lib/mikro-orm/index.ts'

export const loader = withRequestContext(async function loader({
	request,
	...args
}: Route.LoaderArgs) {
	// TODO: Implement preferences update handler
	throw new Error('Not implemented')
})

export const action = withRequestContext(async function action({
	request,
	...args
}: Route.ActionArgs) {
	// TODO: Implement preferences update handler
	throw new Error('Not implemented')
})
