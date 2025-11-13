import type { Route } from './+types/auth.$provider.callback.ts'

import { redirect } from 'react-router'
import { z } from 'zod'

import { ProfileConnectionType } from '~/domain/index.ts'
import { Provider } from '~/lib/auth/strategies/common.ts'
import { authenticator } from '~/lib/auth/index.ts'
import { orm, Profile, ProfileSessionConnection, Session, Token } from '~/lib/mikro-orm/index.ts'
import { createSessionStorage } from '~/lib/session/index.ts'
import { RequestContext } from '@mikro-orm/core'

const schema = {
	loader: {
		params: z.object({
			provider: z.string()
		})
	}
}

export async function loader({ request, ...args }: Route.LoaderArgs) {
	return RequestContext.create(orm.em, async () => {
		const url = new URL(request.url)
		const redirectedFrom = url.searchParams.get('redirected-from') ?? undefined
		const sessionStorage = createSessionStorage()

		const params = schema.loader.params.parse(args.params)
		const strategy = authenticator.get(params.provider)

		if (!strategy) {
			throw new Response('Unsupported provider', { status: 400 })
		}

		const account = await authenticator.authenticate(params.provider, request)
		const em = orm.em

		// Find or create Profile
		let profile = await em.findOne(Profile, {
			id: account.id,
			provider: account.provider
		})

		if (!profile) {
			profile = new Profile()
			profile.id = account.id
			profile.provider = account.provider
			em.persist(profile)
		}

		const { accessToken, refreshToken, expiresAt, scopes, ...rest } = account
		profile.data = rest

		// Find or create Token
		let token = await em.findOne(Token, {
			profileId: profile.id,
			provider: account.provider
		})

		if (!token) {
			token = new Token()
			token.profileId = profile.id
			token.provider = account.provider
			token.profile = profile
			em.persist(token)
		}

		// Update token data
		token.accessToken = account.accessToken
		token.refreshToken = account.refreshToken
		token.expiresAt = account.expiresAt ? new Date(account.expiresAt) : undefined
		token.scopes = account.scopes

		await em.flush()

		const session = await sessionStorage.getSession(request.headers.get('Cookie'))
		const user = session.get('user')

		session.set('user', {
			...user,
			oauth: {
				...user?.oauth,
				[profile.provider]: profile.id
			}
		})

		const cookieHeader = await sessionStorage.commitSession(session)
		const sessionEntity = await em.findOne(Session, { id: session.id })

		if (sessionEntity) {
			// TODO: Shouldn't be based on provider,
			// because some providers can be both worklog target and data source.
			// Need to refactor all logic around this in the future.
			const connectionType =
				account.provider === Provider.Atlassian
					? ProfileConnectionType.WorklogTarget
					: ProfileConnectionType.DataSource

			let connection = await em.findOne(ProfileSessionConnection, {
				profile: { id: profile.id, provider: profile.provider },
				session: sessionEntity,
				connectionType
			})

			if (!connection) {
				connection = new ProfileSessionConnection()
				connection.profile = profile
				connection.session = sessionEntity
				connection.connectionType = connectionType
				em.persist(connection)
				await em.flush()
			}
		}

		return redirect(redirectedFrom ?? '/', {
			headers: {
				'Set-Cookie': cookieHeader
			}
		})
	})
}
