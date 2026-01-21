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
		// // User profile (Atlassian platform)
		// 'read:me',

		// // Projects endpoint
		// 'read:project:jira',
		// 'read:project.property:jira',
		// 'read:issue-type:jira',
		// 'read:application-role:jira',

		// // User search
		// 'read:user:jira',
		// 'read:avatar:jira',
		// 'read:issue:jira',

		// // Issue search (JQL)
		// 'read:issue-details:jira',
		// 'read:issue-meta:jira',
		// 'read:field-configuration:jira',
		// 'read:audit-log:jira',

		// // Worklog read
		// 'read:issue-worklog:jira',
		// 'read:issue-worklog.property:jira',
		// 'read:group:jira',
		// 'read:project-role:jira',

		// // Worklog write
		// 'write:issue-worklog:jira',
		// 'write:issue-worklog.property:jira'

		'read:me',
		'read:jira-user',
		'read:jira-work',
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
			baseUrl: AtlassianStrategy.baseUrl
		})

		const user = await client.getMe()

		return {
			provider: Provider.Atlassian,
			id: user.account_id,
			accountId: user.account_id,
			accountType: user.account_type,
			displayName: user.name ?? user.nickname ?? user.email ?? user.account_id,
			email: user.email,
			avatarUrl: user.picture,
			expiresAt,
			scopes,

			accessToken,
			refreshToken
		}
	}
)
