import type { Authentication } from '../../domain/entities/authentication.ts'

/**
 * AuthenticationViewModel - Presenter View Model
 *
 * Exposes authentication metadata without leaking domain object semantics.
 */
export interface AuthenticationViewModelInit {
	id: string
	profileId: string
	providerType: string
	scopes: string[]
	grantedAt: string
	expiresAt?: string
}

export class AuthenticationViewModel {
	readonly id: string
	readonly profileId: string
	readonly providerType: string
	readonly scopes: string[]
	readonly grantedAt: string
	readonly expiresAt?: string

	constructor(init: AuthenticationViewModelInit) {
		this.id = init.id
		this.profileId = init.profileId
		this.providerType = init.providerType
		this.scopes = init.scopes
		this.grantedAt = init.grantedAt
		this.expiresAt = init.expiresAt
	}

	static fromDomain(authentication: Authentication): AuthenticationViewModel {
		return new AuthenticationViewModel({
			id: authentication.id,
			profileId: authentication.profileId,
			providerType: authentication.providerType,
			scopes: [...authentication.scopes],
			grantedAt: authentication.grantedAt,
			expiresAt: authentication.expiresAt
		})
	}
}
