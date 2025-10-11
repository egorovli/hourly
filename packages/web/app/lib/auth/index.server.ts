/** biome-ignore-all lint/style/noProcessEnv: We need to access secrets */

import { Authenticator } from 'remix-auth'
import { OAuth2Strategy } from 'remix-auth-oauth2'

export interface User {
	id: string
	email: string
	name: string
}

const authenticator = new Authenticator<User>()

authenticator.use(
	new OAuth2Strategy(
		{
			cookie: {
				name: 'oauth2',
				httpOnly: true,
				sameSite: 'Lax',
				secure: true
			},

			clientId: process.env.OAUTH_ATLASSIAN_CLIENT_ID,
			clientSecret: process.env.OAUTH_ATLASSIAN_CLIENT_SECRET,

			authorizationEndpoint: 'https://auth.atlassian.com/authorize',
			tokenEndpoint: 'https://auth.atlassian.com/oauth/token',
			redirectURI: process.env.OAUTH_ATLASSIAN_CALLBACK_URL ?? '',

			scopes: ['read:me', 'read:jira-work', 'read:jira-user', 'write:jira-work'],

			// tokenRevocationEndpoint: 'https://provider.com/oauth2/revoke', // optional

			// scopes: ['openid', 'email', 'profile'], // optional
			// codeChallengeMethod: CodeChallengeMethod.S256, // optional,
			audience: 'api.atlassian.com'
		},

		async function verify({ tokens, request }) {
			async function getUser(tokens, request) {
				console.log({ tokens })

				return {
					id: '1',
					email: 'foo@bar.com',
					name: 'Foo Bar',
					accessToken: tokens.accessToken(),
					refreshToken: tokens.hasRefreshToken() ? tokens.refreshToken() : null
				}
			}

			return getUser(tokens, request)
		}
	),

	'atlassian'
)

export { authenticator }
