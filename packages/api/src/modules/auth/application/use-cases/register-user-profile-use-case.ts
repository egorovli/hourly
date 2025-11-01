import type { RegisterUserProfileCommand } from '../commands/register-user-profile-command.ts'
import type { UserProfile } from '../../domain/entities/user-profile.ts'
import type { UserProfileRepository } from '../../domain/repositories/user-profile-repository.ts'

import { injectable, inject } from 'inversify'

import { InjectionKey } from '../../../../core/ioc/injection-key.enum.ts'
import type { UserProfileFactory } from '../../domain/factories/user-profile-factory.ts'

/**
 * RegisterUserProfileUseCase - Application Use Case
 *
 * Orchestrates creation or update of user profiles while delegating validation
 * to the domain factory and persistence to the repository abstraction.
 */
@injectable()
export class RegisterUserProfileUseCase {
	constructor(
		@inject(InjectionKey.UserProfileFactory)
		private readonly userProfileFactory: UserProfileFactory,

		@inject(InjectionKey.UserProfileRepository)
		private readonly userProfileRepository: UserProfileRepository
	) {}

	/**
	 * Executes the register user profile orchestration.
	 *
	 * @param command - Command describing the desired profile state
	 * @returns Persisted UserProfile entity
	 */
	async execute(command: RegisterUserProfileCommand): Promise<UserProfile> {
		const profile = this.userProfileFactory.create({
			id: command.id,
			providerType: command.providerType,
			provider: command.provider,
			accountId: command.accountId,
			displayName: command.displayName,
			email: command.email,
			username: command.username,
			avatarUrl: command.avatarUrl,
			providerMetadata: command.providerMetadata,
			createdAt: command.createdAt,
			updatedAt: command.updatedAt
		})

		return this.userProfileRepository.save(profile)
	}
}
