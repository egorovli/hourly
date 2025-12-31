import type { Route } from './+types/auth.$provider.sign-in.ts'

export async function loader({ request, ...args }: Route.LoaderArgs) {
	// TODO: Implement preferences update handler
	throw new Error('Not implemented')
}
