import type { Route } from './+types/auth.$provider.callback.ts'

import { DateTime } from 'luxon'
import { z } from 'zod'
import { redirect } from 'react-router'

import { ProfileConnectionType } from '~/domain/index.ts'
import { authenticator } from '~/lib/auth/index.ts'
import { createSessionStorage } from '~/lib/session/index.ts'
import { invariant } from '~/lib/util/index.ts'

import {
	Profile,
	ProfileSessionConnection,
	Session,
	Token,
	orm,
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
	const { em } = orm
	const sessionStorage = createSessionStorage()

	const params = await schema.loader.params.parseAsync(args.params)
	const strategy = authenticator.get(params.provider)

	if (!strategy) {
		throw new Error(`Strategy ${params.provider} not found`)
	}

	const account = await authenticator.authenticate(strategy.name, request)

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

	const profileData = (() => {
		const { accessToken, refreshToken, expiresAt, scopes, ...rest } = account
		return rest
	})()

	profile.data = profileData
	profile.deletedAt = undefined
	profile.reportedAt = undefined
	profile.updatedAt = new Date()

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

	token.accessToken = account.accessToken
	token.refreshToken = account.refreshToken
	token.expiresAt = account.expiresAt ? new Date(account.expiresAt) : undefined
	token.scopes = account.scopes
	token.updatedAt = new Date()

	await em.flush()

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

	const session = await em.findOne(Session, { id: cookieSession.id })
	invariant(session, 'Session not found')

	// TODO: Shouldn't be based on provider, because some providers can be both
	// worklog target and data source. Need to refactor all logic around this in
	// the future.
	const connectionType = ProfileConnectionType.WorklogTarget

	let connection = await em.findOne(ProfileSessionConnection, {
		profile: { id: profile.id, provider: profile.provider },
		session,
		connectionType
	})

	if (!connection) {
		connection = new ProfileSessionConnection()
		connection.profile = profile
		connection.session = session
		connection.connectionType = connectionType
		em.persist(connection)
	}

	await em.flush()

	const redirectTo = new URL('/', request.url)

	return redirect(redirectTo.toString(), {
		headers: {
			'Set-Cookie': setCookieHeader
		}
	})
})
