import type { Route } from './+types/auth.$provider.sign-in.ts'

import { z } from 'zod'

import { authenticator } from '~/lib/auth/index.ts'
import { withRequestContext } from '~/lib/mikro-orm/index.ts'

const schema = {
	loader: {
		query: z.object({
			scopes: z.preprocess(value => (Array.isArray(value) ? value : [value]), z.string().array())
		})
	}
}

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

	const url = new URL(request.url)
	const query = await schema.loader.query.parseAsync({
		scopes: url.searchParams.getAll('scope')
	})

	console.log(query)

	return authenticator.authenticate(strategy.name, request)
})
