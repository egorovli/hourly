import type { Route } from './+types/auth.$provider.sign-out.ts'

import { z } from 'zod'

import * as sessionStorage from '~/lib/session/storage.ts'

const schema = {
	loader: {
		params: z.object({
			provider: z.string()
		})
	}
}

export async function loader({ request, ...args }: Route.LoaderArgs) {
	const params = schema.loader.params.parse(args.params)
	const cookie = request.headers.get('Cookie')
	const session = await sessionStorage.getSession(cookie)

	// TODO: Implement provider sign out handler
	throw new Error('Not implemented')
}
