import type { Route } from './+types/auth.$provider.sign-in.ts'

import { z } from 'zod'

import { authenticator } from '~/lib/auth/index.ts'

const schema = {
	loader: {
		params: z.object({
			provider: z.string()
		})
	}
}

export async function loader({ request, ...args }: Route.LoaderArgs) {
	const url = new URL(request.url)
	const redirectedFrom = url.searchParams.get('redirected-from') ?? undefined

	const params = schema.loader.params.parse(args.params)
	const strategy = authenticator.get(params.provider)

	if (!strategy) {
		throw new Response('Unsupported provider', { status: 400 })
	}

	await authenticator.authenticate(params.provider, request)
}
