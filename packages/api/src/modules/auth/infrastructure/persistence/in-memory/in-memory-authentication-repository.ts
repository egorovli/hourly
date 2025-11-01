import type { AuthenticationRepository } from '../../../domain/repositories/authentication-repository.ts'
import type { ProviderType } from '../../../domain/value-objects/provider-type.ts'
import type { Authentication } from '../../../domain/entities/authentication.ts'

import { injectable } from 'inversify'

@injectable()
export class InMemoryAuthenticationRepository implements AuthenticationRepository {
	private readonly authentications = new Map<string, Authentication>()

	async save(authentication: Authentication): Promise<Authentication> {
		this.authentications.set(authentication.id, authentication)
		return authentication
	}

	async findById(id: string): Promise<Authentication | null> {
		return this.authentications.get(id) ?? null
	}

	async findByProfileAndProvider(
		profileId: string,
		providerType: ProviderType
	): Promise<Authentication | null> {
		return (
			[...this.authentications.values()].find(
				auth => auth.profileId === profileId && auth.providerType === providerType
			) ?? null
		)
	}

	async findByProfile(profileId: string): Promise<Authentication[]> {
		return [...this.authentications.values()].filter(auth => auth.profileId === profileId)
	}

	async findByProvider(providerType: ProviderType): Promise<Authentication[]> {
		return [...this.authentications.values()].filter(auth => auth.providerType === providerType)
	}

	async delete(id: string): Promise<void> {
		this.authentications.delete(id)
	}
}
