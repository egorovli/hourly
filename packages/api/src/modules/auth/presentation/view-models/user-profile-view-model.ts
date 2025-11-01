import type { UserProfile } from '../../domain/entities/user-profile.ts'

/**
 * UserProfileViewModel - Presenter View Model
 *
 * Represents the data exposed by interface adapters when returning user profile information.
 * Keeps consumers agnostic of domain entity internals and allows HTTP/CLI adapters to share the
 * same output contract.
 */
export interface UserProfileViewModelInit {
	id: string
	providerType: string
	provider: string
	accountId: string
	displayName?: string
	email?: string
	username?: string
	avatarUrl?: string
	createdAt: string
	updatedAt: string
}

export class UserProfileViewModel {
	readonly id: string
	readonly providerType: string
	readonly provider: string
	readonly accountId: string
	readonly displayName?: string
	readonly email?: string
	readonly username?: string
	readonly avatarUrl?: string
	readonly createdAt: string
	readonly updatedAt: string

	constructor(init: UserProfileViewModelInit) {
		this.id = init.id
		this.providerType = init.providerType
		this.provider = init.provider
		this.accountId = init.accountId
		this.displayName = init.displayName
		this.email = init.email
		this.username = init.username
		this.avatarUrl = init.avatarUrl
		this.createdAt = init.createdAt
		this.updatedAt = init.updatedAt
	}

	static fromDomain(profile: UserProfile): UserProfileViewModel {
		return new UserProfileViewModel({
			id: profile.id,
			providerType: profile.providerType,
			provider: profile.provider,
			accountId: profile.accountId,
			displayName: profile.displayName,
			email: profile.email,
			username: profile.username,
			avatarUrl: profile.avatarUrl,
			createdAt: profile.createdAt.toISOString(),
			updatedAt: profile.updatedAt.toISOString()
		})
	}
}
