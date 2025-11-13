import type { Route } from './+types/auth.$provider.callback.ts'

import { redirect } from 'react-router'
import { z } from 'zod'
import { DateTime } from 'luxon'

import { ProfileConnectionType } from '~/domain/index.ts'
import { authenticator } from '~/lib/auth/index.ts'
import { Provider } from '~/lib/auth/strategies/common.ts'
import { createSessionStorage } from '~/lib/session/index.ts'
import { invariant } from '~/lib/util/invariant.ts'

import {
	orm,
	Profile,
	ProfileSessionConnection,
	Session,
	Token,
	withRequestContext
} from '~/lib/mikro-orm/index.ts'

const schema = {
	loader: {
		params: z.object({
			provider: z.string()
		})
	}
}

export const loader = withRequestContext(async function loader({
	request,
	...args
}: Route.LoaderArgs) {
	const url = new URL(request.url)
	const redirectedFrom = url.searchParams.get('redirected-from') ?? undefined
	const sessionStorage = createSessionStorage()

	const params = schema.loader.params.parse(args.params)
	const strategy = authenticator.get(params.provider)

	if (!strategy) {
		throw new Response('Unsupported provider', { status: 400 })
	}

	const account = await authenticator.authenticate(params.provider, request)

	let profile = await orm.em.findOne(Profile, {
		id: account.id,
		provider: account.provider
	})

	if (!profile) {
		profile = new Profile()
		profile.id = account.id
		profile.provider = account.provider
		orm.em.persist(profile)
	}

	const { accessToken, refreshToken, expiresAt, scopes, ...rest } = account
	profile.data = rest
	profile.updatedAt = new Date()

	let token = await orm.em.findOne(Token, {
		profileId: profile.id,
		provider: account.provider
	})

	if (!token) {
		token = new Token()
		token.profileId = profile.id
		token.provider = account.provider
		token.profile = profile
		orm.em.persist(token)
	}

	token.accessToken = account.accessToken
	token.refreshToken = account.refreshToken
	token.expiresAt = account.expiresAt ? new Date(account.expiresAt) : undefined
	token.scopes = account.scopes
	token.updatedAt = new Date()

	await orm.em.flush()

	let cookieSession = await sessionStorage.getSession(request.headers.get('Cookie'))

	const setCookieHeader = await sessionStorage.commitSession(cookieSession, {
		// TODO: Expiration should be based on all tokens, not just the current one.
		// We should identify the token with the shortest expiration date and use
		// it.
		expires: token.expiresAt ?? DateTime.now().plus({ hours: 1 }).toJSDate()
	})

	// TODO: Not sure it's the best way, but it's the only one I've found to
	// actually get the ID of the session.
	cookieSession = await sessionStorage.getSession(setCookieHeader)

	const session = await orm.em.findOne(Session, { id: cookieSession.id })
	invariant(session, 'Session not found')

	// TODO: Shouldn't be based on provider, because some providers can be both
	// worklog target and data source. Need to refactor all logic around this in
	// the future.
	const connectionType =
		account.provider === Provider.Atlassian
			? ProfileConnectionType.WorklogTarget
			: ProfileConnectionType.DataSource

	let connection = await orm.em.findOne(ProfileSessionConnection, {
		profile: { id: profile.id, provider: profile.provider },
		session,
		connectionType
	})

	if (!connection) {
		connection = new ProfileSessionConnection()
		connection.profile = profile
		connection.session = session
		connection.connectionType = connectionType
		orm.em.persist(connection)
		await orm.em.flush()
	}

	return redirect(redirectedFrom ?? '/', {
		headers: {
			'Set-Cookie': setCookieHeader
		}
	})
})
