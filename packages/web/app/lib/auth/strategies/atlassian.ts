/** biome-ignore-all lint/style/noProcessEnv: We need to read env variables */

import type { ProviderAccount } from './common.ts'

import { OAuth2Strategy } from 'remix-auth-oauth2'
import { nanoid } from 'nanoid'

import { AtlassianClient } from '~/lib/atlassian/index.ts'

import { cookieOptionsDefaults, Provider, resolveExpiresAt, resolveScopes } from './common.ts'

interface CreateAuthorizationURLResult {
	state: string
	codeVerifier: string
	url: URL
}

export class AtlassianStrategy<User> extends OAuth2Strategy<User> {
	override name = 'atlassian'

	static scopes = [
		'offline_access',
		'read:me',
		'read:jira-work',
		'read:jira-user',
		'write:jira-work'
	]

	static baseUrl = process.env.OAUTH_ATLASSIAN_BASE_URL ?? 'https://api.atlassian.com'

	protected override authorizationParams(
		params: URLSearchParams,
		request: Request
	): URLSearchParams {
		const resolved = super.authorizationParams(params, request)
		resolved.set('prompt', resolved.get('prompt') ?? 'consent')

		return resolved
	}

	protected override createAuthorizationURL(): CreateAuthorizationURLResult {
		const result = super.createAuthorizationURL()

		const state = nanoid()
		const url = new URL(result.url)

		url.searchParams.set('state', state)

		return {
			...result,
			state,
			url
		}
	}
}

export const atlassianStrategy = new AtlassianStrategy<ProviderAccount>(
	{
		cookie: {
			name: 'oauth:atlassian',
			...cookieOptionsDefaults
		},
		clientId: process.env.OAUTH_ATLASSIAN_CLIENT_ID,
		clientSecret: process.env.OAUTH_ATLASSIAN_CLIENT_SECRET,
		authorizationEndpoint: 'https://auth.atlassian.com/authorize',
		tokenEndpoint: 'https://auth.atlassian.com/oauth/token',
		redirectURI: process.env.OAUTH_ATLASSIAN_CALLBACK_URL,
		scopes: AtlassianStrategy.scopes,
		audience: 'api.atlassian.com'
	},

	async function verifyAtlassianOAuth2Callback({ tokens }) {
		const accessToken = tokens.accessToken()
		const refreshToken = tokens.hasRefreshToken() ? tokens.refreshToken() : undefined

		const expiresAt = resolveExpiresAt(tokens)
		const scopes = resolveScopes(tokens, AtlassianStrategy.scopes)

		const client = new AtlassianClient({
			accessToken,
			refreshToken,
			baseUrl: AtlassianStrategy.baseUrl
		})

		const profile = await client.getMe()

		return {
			provider: Provider.Atlassian,
			id: profile.account_id,
			accountId: profile.account_id,
			accountType: profile.account_type,
			displayName: profile.name ?? profile.nickname ?? profile.email ?? profile.account_id,
			email: profile.email,
			avatarUrl: profile.picture,
			expiresAt,
			scopes,

			accessToken,
			refreshToken
		}
	}
)
