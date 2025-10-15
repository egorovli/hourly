/** biome-ignore-all lint/style/noProcessEnv: We need to read env variables */

import type { SetCookieInit } from '@mjackson/headers'
import type { OAuth2Tokens } from 'arctic'

type OAuthCookieOptions = Omit<SetCookieInit, 'value'> & {
	name: string
}

export const cookieOptionsDefaults: Partial<OAuthCookieOptions> = {
	httpOnly: true,
	sameSite: 'Lax',
	...(process.env.SESSION_SECURE === 'true' ? { secure: true as const } : {})
}

export type ProviderKey = 'atlassian' | 'gitlab'

interface ProviderAccountBase {
	provider: ProviderKey
	id: string
	displayName: string
	email?: string
	avatarUrl?: string
	expiresAt?: string
	scopes: string[]
	accessToken: string
	refreshToken?: string
}

export interface AtlassianAccount extends ProviderAccountBase {
	provider: 'atlassian'
	accountId: string
	accountType: string
}

export interface GitLabAccount extends ProviderAccountBase {
	provider: 'gitlab'
	username: string
	webUrl?: string
}

export type ProviderAccount = AtlassianAccount | GitLabAccount

export function resolveExpiresAt(tokens: OAuth2Tokens): string | undefined {
	try {
		return tokens.accessTokenExpiresAt().toISOString()
	} catch {
		// If the token does not expire, we just return undefined
	}

	return undefined
}

export function resolveScopes(tokens: OAuth2Tokens, fallback: string[]): string[] {
	if (tokens.hasScopes()) {
		return tokens.scopes()
	}

	return fallback
}
