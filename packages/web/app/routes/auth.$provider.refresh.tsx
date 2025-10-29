/** biome-ignore-all lint/style/noProcessEnv: We need to read env variables */

import type { Route } from './+types/auth.$provider.refresh.ts'

import { data } from 'react-router'
import { z } from 'zod'

import { refreshAtlassianToken, refreshGitLabToken } from '~/features/auth/index.ts'
import { orm } from '~/lib/mikro-orm/index.ts'
import { Token } from '~/lib/mikro-orm/entities/index.ts'
import * as sessionStorage from '~/lib/session/storage.ts'
import { calculateSessionExpiration } from '~/lib/session/helpers.ts'

const schema = {
	action: {
		params: z.object({
			provider: z.enum(['atlassian', 'gitlab'])
		})
	}
}

export async function action({ request, ...args }: Route.ActionArgs) {
	const params = schema.action.params.parse(args.params)
	const { provider } = params

	const session = await sessionStorage.getSession(request.headers.get('Cookie'))
	const user = session.get('user')

	if (!user) {
		return data(
			{
				success: false,
				error: 'Not authenticated'
			},
			{ status: 401 }
		)
	}

	// Get provider info from session
	const providerAuth = user[provider]
	if (!providerAuth) {
		return data(
			{
				success: false,
				error: `${provider} not authenticated`
			},
			{ status: 400 }
		)
	}

	// Get token from database
	const em = orm.em.fork()
	const token = await em.findOne(Token, {
		profileId: providerAuth.id,
		provider
	})

	if (!token) {
		return data(
			{
				success: false,
				error: 'Token not found'
			},
			{ status: 404 }
		)
	}

	if (!token.refreshToken) {
		return data(
			{
				success: false,
				error: 'No refresh token available'
			},
			{ status: 400 }
		)
	}

	// Refresh the token based on provider
	let result: RefreshTokenResult
	if (provider === 'atlassian') {
		const clientId = process.env.OAUTH_ATLASSIAN_CLIENT_ID
		const clientSecret = process.env.OAUTH_ATLASSIAN_CLIENT_SECRET

		if (!clientId || !clientSecret) {
			return data(
				{
					success: false,
					error: 'Atlassian OAuth credentials not configured'
				},
				{ status: 500 }
			)
		}

		result = await refreshAtlassianToken({
			profileId: providerAuth.id,
			currentRefreshToken: token.refreshToken,
			clientId,
			clientSecret
		})
	} else {
		const clientId = process.env.OAUTH_GITLAB_CLIENT_ID
		const clientSecret = process.env.OAUTH_GITLAB_CLIENT_SECRET
		const baseUrl = process.env.OAUTH_GITLAB_BASE_URL

		if (!clientId || !clientSecret) {
			return data(
				{
					success: false,
					error: 'GitLab OAuth credentials not configured'
				},
				{ status: 500 }
			)
		}

		result = await refreshGitLabToken({
			profileId: providerAuth.id,
			currentRefreshToken: token.refreshToken,
			clientId,
			clientSecret,
			baseUrl
		})
	}

	if (!result.success) {
		return data(
			{
				success: false,
				error: result.error
			},
			{ status: 400 }
		)
	}

	// Update session with new expiration
	session.set('user', {
		...user,
		[provider]: {
			...providerAuth,
			tokenExpiresAt: result.expiresAt
		}
	})

	// Calculate new session expiration
	const updatedUser = session.get('user')
	const sessionExpires = updatedUser ? calculateSessionExpiration(updatedUser) : undefined

	return data(
		{
			success: true,
			expiresAt: result.expiresAt
		},
		{
			headers: {
				'Set-Cookie': await sessionStorage.commitSession(session, {
					expires: sessionExpires
				})
			}
		}
	)
}
