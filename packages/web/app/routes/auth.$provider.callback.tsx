import type { Route } from './+types/auth.$provider.callback.ts'

import { redirect } from 'react-router'
import { z } from 'zod'

import type { ProviderAccount } from '~/lib/auth/strategies/common.ts'

import { authenticator } from '~/lib/auth/index.ts'
import { orm } from '~/lib/mikro-orm/index.ts'
import { Profile, Token } from '~/lib/mikro-orm/entities/index.ts'
import * as sessionStorage from '~/lib/session/storage.ts'
import { calculateSessionExpiration } from '~/lib/session/helpers.ts'
import { getErrorMessage } from '~/shared/lib/formats/format-error.ts'

const schema = {
	loader: {
		params: z.object({
			provider: z.string()
		})
	}
}

/**
 * Extract user-friendly error message from OAuth error
 */
function getFriendlyErrorMessage(errorMessage: string): {
	title: string
	description: string
	details?: string
} {
	if (errorMessage.includes('invalid_grant')) {
		return {
			title: 'Invalid Authorization Code',
			description: 'The authorization code has expired or is invalid. Please try signing in again.',
			details: errorMessage
		}
	}
	if (errorMessage.includes('access_denied')) {
		return {
			title: 'Access Denied',
			description: 'Authorization was denied. Please try again.',
			details: errorMessage
		}
	}
	if (errorMessage.includes('OAuth request error')) {
		const oauthErrorMatch = errorMessage.match(/OAuth request error: (.+)/)
		if (oauthErrorMatch) {
			return {
				title: 'OAuth Error',
				description: `Authentication error: ${oauthErrorMatch[1]}. Please try again.`,
				details: errorMessage
			}
		}
	}
	return {
		title: 'Authentication Failed',
		description: 'An error occurred during authentication. Please try again.',
		details: errorMessage
	}
}

/**
 * Handle OAuth authentication error and redirect to sign-in with flash message
 */
async function handleAuthError(error: unknown, request: Request): Promise<Response> {
	const session = await sessionStorage.getSession(request.headers.get('Cookie'))
	const errorMessage = getErrorMessage(error)
	const errorInfo = getFriendlyErrorMessage(errorMessage)

	// Debug: log to see if flash data is being set
	if (import.meta.env.DEV) {
		console.log('[auth.callback] Error details:', {
			title: errorInfo.title,
			description: errorInfo.description,
			details: errorInfo.details,
			rawError: error
		})
	}

	// Include both title and description in the error parameter
	// Format: "title|description|details" (details optional)
	const errorParam = encodeURIComponent(
		JSON.stringify({
			title: errorInfo.title,
			description: errorInfo.description,
			details: errorInfo.details
		})
	)

	return redirect(`/auth/sign-in?error=${errorParam}`, {
		headers: {
			'Set-Cookie': await sessionStorage.commitSession(session)
		}
	})
}

export async function loader({ request, ...args }: Route.LoaderArgs) {
	const params = schema.loader.params.parse(args.params)
	const strategy = authenticator.get(params.provider)

	if (!strategy) {
		throw new Response('Unsupported provider', { status: 400 })
	}

	let account: ProviderAccount | null
	try {
		account = await authenticator.authenticate(params.provider, request)
	} catch (error) {
		return handleAuthError(error, request)
	}

	if (!account) {
		return handleAuthError(new Error('Authentication failed'), request)
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
	const session = await sessionStorage.getSession(request.headers.get('Cookie'))
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
			'Set-Cookie': await sessionStorage.commitSession(session, {
				expires: sessionExpires
			})
		}
	})
}
