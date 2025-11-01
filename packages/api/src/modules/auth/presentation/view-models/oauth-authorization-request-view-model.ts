import type { OAuthAuthorizationRequest } from '../../domain/value-objects/oauth-authorization-request.ts'

/**
 * OAuthAuthorizationRequestViewModel - Presenter View Model
 *
 * Provides a transport-friendly representation of OAuth authorization requests.
 */
export interface OAuthAuthorizationRequestViewModelInit {
	state: string
	providerType: string
	redirectUri: string
	scopes: string[]
	createdAt: string
	expiresAt: string
}

export class OAuthAuthorizationRequestViewModel {
	readonly state: string
	readonly providerType: string
	readonly redirectUri: string
	readonly scopes: string[]
	readonly createdAt: string
	readonly expiresAt: string

	constructor(init: OAuthAuthorizationRequestViewModelInit) {
		this.state = init.state
		this.providerType = init.providerType
		this.redirectUri = init.redirectUri
		this.scopes = init.scopes
		this.createdAt = init.createdAt
		this.expiresAt = init.expiresAt
	}

	static fromDomain(request: OAuthAuthorizationRequest): OAuthAuthorizationRequestViewModel {
		return new OAuthAuthorizationRequestViewModel({
			state: request.state,
			providerType: request.providerType,
			redirectUri: request.redirectUri,
			scopes: [...request.scopes],
			createdAt: request.createdAt,
			expiresAt: request.expiresAt
		})
	}
}
