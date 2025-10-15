import { redirect } from 'react-router'
import type { Route } from './+types/auth.$provider.callback.ts'

import { z } from 'zod'

import { authenticator } from '~/lib/auth/index.ts'
import { orm } from '~/lib/mikro-orm/index.ts'
import { Profile, Token } from '~/lib/mikro-orm/entities/index.ts'
import { getSession, commitSession } from '~/lib/session/storage.ts'
import { calculateSessionExpiration } from '~/lib/session/helpers.ts'

const schema = {
	loader: {
		params: z.object({
			provider: z.string()
		})
	}
}

export async function loader({ request, ...args }: Route.LoaderArgs) {
	const params = schema.loader.params.parse(args.params)
	const strategy = authenticator.get(params.provider)

	if (!strategy) {
		throw new Response('Unsupported provider', { status: 400 })
	}

	const account = await authenticator.authenticate(params.provider, request)

	if (!account) {
		throw new Response('Authentication failed', { status: 401 })
	}

	const em = orm.em.fork()
	const { id, provider, accessToken, refreshToken, expiresAt, scopes, ...rest } = account

	// Upsert profile
	await em.upsert(
		Profile,
		{
			id,
			provider,
			data: rest,
			createdAt: new Date(),
			updatedAt: new Date()
		},
		{
			onConflictFields: ['id', 'provider'],
			onConflictAction: 'merge',
			onConflictExcludeFields: ['createdAt']
		}
	)

	// Upsert token
	await em.upsert(
		Token,
		{
			profileId: id,
			provider,
			accessToken,
			refreshToken,
			expiresAt,
			scopes,
			createdAt: new Date(),
			updatedAt: new Date()
		},
		{
			onConflictFields: ['profileId', 'provider'],
			onConflictAction: 'merge',
			onConflictExcludeFields: ['createdAt']
		}
	)

	await em.flush()

	// Update session with provider authentication
	const session = await getSession(request.headers.get('Cookie'))
	const currentUser = session.get('user') || {}

	session.set('user', {
		...currentUser,
		[provider]: {
			id: account.id,
			displayName: account.displayName,
			email: account.email,
			tokenExpiresAt: expiresAt,
			avatarUrl: account.avatarUrl
		}
	})

	// Check if both providers are authenticated
	const user = session.get('user')
	const fullyAuthenticated = user?.atlassian && user?.gitlab

	// Get redirect destination from session (stored during sign-in)
	const redirectTo = fullyAuthenticated ? session.get('redirected-from') || '/' : '/auth/sign-in'

	if (fullyAuthenticated) {
		session.unset('redirected-from') // Clean up only when fully authenticated
	}

	// Calculate session expiration based on shortest token expiration
	const sessionExpires = user ? calculateSessionExpiration(user) : undefined

	return redirect(redirectTo, {
		headers: {
			'Set-Cookie': await commitSession(session, {
				expires: sessionExpires
			})
		}
	})
}
