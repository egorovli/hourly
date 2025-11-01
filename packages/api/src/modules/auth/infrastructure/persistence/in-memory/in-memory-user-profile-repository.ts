import type { UserProfileRepository } from '../../../domain/repositories/user-profile-repository.ts'
import type { ProviderType } from '../../../domain/value-objects/provider-type.ts'
import type { UserProfile } from '../../../domain/entities/user-profile.ts'

import { injectable } from 'inversify'

@injectable()
export class InMemoryUserProfileRepository implements UserProfileRepository {
	private readonly profiles = new Map<string, UserProfile>()

	async save(profile: UserProfile): Promise<UserProfile> {
		this.profiles.set(this.composeKey(profile.id, profile.providerType), profile)
		return profile
	}

	async findById(id: string, providerType: ProviderType): Promise<UserProfile | null> {
		return this.profiles.get(this.composeKey(id, providerType)) ?? null
	}

	async findByProvider(providerType: ProviderType): Promise<UserProfile[]> {
		return [...this.profiles.values()].filter(profile => profile.providerType === providerType)
	}

	async findMatchingProfiles(profile: UserProfile): Promise<UserProfile[]> {
		return [...this.profiles.values()].filter(candidate => {
			if (candidate.equals(profile)) {
				return false
			}

			if (candidate.accountId && profile.accountId && candidate.accountId === profile.accountId) {
				return true
			}

			if (candidate.email && profile.email && candidate.email === profile.email) {
				return true
			}

			if (candidate.username && profile.username && candidate.username === profile.username) {
				return true
			}

			return false
		})
	}

	async delete(id: string, providerType: ProviderType): Promise<void> {
		this.profiles.delete(this.composeKey(id, providerType))
	}

	private composeKey(id: string, providerType: ProviderType): string {
		return `${providerType}:${id}`
	}
}
