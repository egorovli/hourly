import type { Route } from './+types/auth.$provider.sign-out.ts'

import { RequestContext } from '@mikro-orm/core'
import { z } from 'zod'

import { orm } from '~/lib/mikro-orm/index.ts'
import { createSessionStorage } from '~/lib/session/index.ts'

const schema = {
	loader: {
		params: z.object({
			provider: z.string()
		})
	}
}

export async function loader({ request, ...args }: Route.LoaderArgs) {
	return RequestContext.create(orm.em, async () => {
		const params = schema.loader.params.parse(args.params)
		const cookie = request.headers.get('Cookie')
		const sessionStorage = createSessionStorage()
		const session = await sessionStorage.getSession(cookie)

		// TODO: Implement provider sign out handler
		throw new Error('Not implemented')
	})
}
