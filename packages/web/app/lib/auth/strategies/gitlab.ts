/** biome-ignore-all lint/style/noProcessEnv: We need to access env variables */

import type { ProviderAccount } from './common.ts'

import { OAuth2Strategy } from 'remix-auth-oauth2'

import { GitLabClient } from '~/lib/gitlab/index.ts'

import { cookieOptionsDefaults, Provider, resolveExpiresAt, resolveScopes } from './common.ts'

export class GitlabStrategy<User> extends OAuth2Strategy<User> {
	override name = 'atlassian'

	static scopes = ['api', 'read_user']
	static baseUrl = process.env.OAUTH_GITLAB_BASE_URL ?? 'https://gitlab.com'
}

export const gitlabStrategy = new GitlabStrategy<ProviderAccount>(
	{
		cookie: {
			name: 'oauth:atlassian',
			...cookieOptionsDefaults
		},
		clientId: process.env.OAUTH_GITLAB_CLIENT_ID,
		clientSecret: process.env.OAUTH_GITLAB_CLIENT_SECRET,
		authorizationEndpoint: new URL('/oauth/authorize', GitlabStrategy.baseUrl),
		tokenEndpoint: new URL('/oauth/token', GitlabStrategy.baseUrl),
		redirectURI: process.env.OAUTH_GITLAB_CALLBACK_URL,
		scopes: GitlabStrategy.scopes
	},

	async function verifyGitlabOAuth2Callback({ tokens }) {
		const accessToken = tokens.accessToken()
		const refreshToken = tokens.hasRefreshToken() ? tokens.refreshToken() : undefined

		const expiresAt = resolveExpiresAt(tokens)
		const scopes = resolveScopes(tokens, GitlabStrategy.scopes)

		const client = new GitLabClient({
			accessToken,
			refreshToken,
			baseUrl: new URL('/api/v4', GitlabStrategy.baseUrl).toString()
		})

		const profile = await client.getCurrentUser()

		return {
			provider: Provider.GitLab,
			id: profile.id.toString(),
			username: profile.username,
			displayName: profile.name ?? profile.username,
			email: profile.email ?? profile.public_email ?? undefined,
			avatarUrl: profile.avatar_url,
			webUrl: profile.web_url,
			expiresAt,
			scopes,

			accessToken,
			refreshToken
		}
	}
)
