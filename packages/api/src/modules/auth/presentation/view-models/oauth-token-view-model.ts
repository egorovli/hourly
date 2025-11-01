import type { OAuthToken } from '../../domain/entities/oauth-token.ts'

/**
 * OAuthTokenViewModel - Presenter View Model
 *
 * Exposes token metadata for adapters that need to forward token details.
 * Adapters can redact sensitive fields if required before delivering to consumers.
 */
export interface OAuthTokenViewModelInit {
	authenticationId: string
	accessToken: string
	refreshToken?: string
	expiresAt?: string
	tokenType: string
	updatedAt: string
}

export class OAuthTokenViewModel {
	readonly authenticationId: string
	readonly accessToken: string
	readonly refreshToken?: string
	readonly expiresAt?: string
	readonly tokenType: string
	readonly updatedAt: string

	constructor(init: OAuthTokenViewModelInit) {
		this.authenticationId = init.authenticationId
		this.accessToken = init.accessToken
		this.refreshToken = init.refreshToken
		this.expiresAt = init.expiresAt
		this.tokenType = init.tokenType
		this.updatedAt = init.updatedAt
	}

	static fromDomain(token: OAuthToken): OAuthTokenViewModel {
		return new OAuthTokenViewModel({
			authenticationId: token.authenticationId,
			accessToken: token.accessToken,
			refreshToken: token.refreshToken,
			expiresAt: token.expiresAt,
			tokenType: token.tokenType,
			updatedAt: token.updatedAt
		})
	}
}
