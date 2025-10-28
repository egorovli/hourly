import { orm } from '~/lib/mikro-orm/index.ts'
import { Token } from '~/lib/mikro-orm/entities/index.ts'

export interface RefreshTokenResult {
	success: boolean
	accessToken?: string
	refreshToken?: string
	expiresAt?: string
	error?: string
}

export interface RefreshAtlassianTokenOptions {
	profileId: string
	currentRefreshToken: string
	clientId: string
	clientSecret: string
}

export interface RefreshGitLabTokenOptions {
	profileId: string
	currentRefreshToken: string
	clientId: string
	clientSecret: string
	baseUrl?: string
}

/**
 * Refresh Atlassian OAuth token using the refresh token
 */
export async function refreshAtlassianToken({
	profileId,
	currentRefreshToken,
	clientId,
	clientSecret
}: RefreshAtlassianTokenOptions): Promise<RefreshTokenResult> {
	try {
		const tokenEndpoint = 'https://auth.atlassian.com/oauth/token'

		const response = await fetch(tokenEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				grant_type: 'refresh_token',
				client_id: clientId,
				client_secret: clientSecret,
				refresh_token: currentRefreshToken
			})
		})

		if (!response.ok) {
			const errorText = await response.text()
			return {
				success: false,
				error: `Failed to refresh Atlassian token: ${response.status} - ${errorText}`
			}
		}

		const data = (await response.json()) as {
			access_token: string
			refresh_token?: string
			expires_in?: number
		}

		// Calculate expiresAt from expires_in (seconds)
		const expiresAt = data.expires_in
			? new Date(Date.now() + data.expires_in * 1000).toISOString()
			: undefined

		// Update token in database
		const em = orm.em.fork()
		const token = await em.findOne(Token, {
			profileId,
			provider: 'atlassian'
		})

		if (!token) {
			return {
				success: false,
				error: 'Token not found in database'
			}
		}

		token.accessToken = data.access_token
		if (data.refresh_token) {
			token.refreshToken = data.refresh_token
		}
		if (expiresAt) {
			token.expiresAt = expiresAt
		}
		token.updatedAt = new Date()

		await em.flush()

		return {
			success: true,
			accessToken: data.access_token,
			refreshToken: data.refresh_token,
			expiresAt
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error during token refresh'
		}
	}
}

/**
 * Refresh GitLab OAuth token using the refresh token
 */
export async function refreshGitLabToken({
	profileId,
	currentRefreshToken,
	clientId,
	clientSecret,
	baseUrl = 'https://gitlab.com'
}: RefreshGitLabTokenOptions): Promise<RefreshTokenResult> {
	try {
		const tokenEndpoint = new URL('/oauth/token', baseUrl).toString()

		const response = await fetch(tokenEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				grant_type: 'refresh_token',
				client_id: clientId,
				client_secret: clientSecret,
				refresh_token: currentRefreshToken
			})
		})

		if (!response.ok) {
			const errorText = await response.text()
			return {
				success: false,
				error: `Failed to refresh GitLab token: ${response.status} - ${errorText}`
			}
		}

		const data = (await response.json()) as {
			access_token: string
			refresh_token?: string
			expires_in?: number
		}

		// Calculate expiresAt from expires_in (seconds)
		const expiresAt = data.expires_in
			? new Date(Date.now() + data.expires_in * 1000).toISOString()
			: undefined

		// Update token in database
		const em = orm.em.fork()
		const token = await em.findOne(Token, {
			profileId,
			provider: 'gitlab'
		})

		if (!token) {
			return {
				success: false,
				error: 'Token not found in database'
			}
		}

		token.accessToken = data.access_token
		if (data.refresh_token) {
			token.refreshToken = data.refresh_token
		}
		if (expiresAt) {
			token.expiresAt = expiresAt
		}
		token.updatedAt = new Date()

		await em.flush()

		return {
			success: true,
			accessToken: data.access_token,
			refreshToken: data.refresh_token,
			expiresAt
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error during token refresh'
		}
	}
}
