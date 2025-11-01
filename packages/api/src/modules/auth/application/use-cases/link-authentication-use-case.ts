import type { LinkAuthenticationCommand } from '../commands/link-authentication-command.ts'
import type { Authentication } from '../../domain/entities/authentication.ts'
import type { AuthenticationRepository } from '../../domain/repositories/authentication-repository.ts'
import type { UserProfileRepository } from '../../domain/repositories/user-profile-repository.ts'

import { injectable, inject } from 'inversify'

import { BusinessRuleError } from '../../../../core/errors/business-rule-error.ts'
import { InjectionKey } from '../../../../core/ioc/injection-key.enum.ts'
import { Authentication as AuthenticationEntity } from '../../domain/entities/authentication.ts'

/**
 * LinkAuthenticationUseCase - Application Use Case
 *
 * Coordinates association between a user profile and an authentication record.
 * Ensures the profile exists and delegates persistence to repository abstractions.
 */
@injectable()
export class LinkAuthenticationUseCase {
	constructor(
		@inject(InjectionKey.UserProfileRepository)
		private readonly userProfileRepository: UserProfileRepository,

		@inject(InjectionKey.AuthenticationRepository)
		private readonly authenticationRepository: AuthenticationRepository
	) {}

	/**
	 * Executes the link authentication orchestration.
	 *
	 * @param command - Command describing the authentication linkage
	 * @returns Persisted Authentication entity
	 * @throws BusinessRuleError when the target profile does not exist
	 */
	async execute(command: LinkAuthenticationCommand): Promise<Authentication> {
		const profile = await this.userProfileRepository.findById(
			command.profileId,
			command.providerType
		)

		if (!profile) {
			throw new BusinessRuleError(
				`Cannot link authentication: profile ${command.profileId} (${command.providerType}) not found`
			)
		}

		const existing = await this.authenticationRepository.findByProfileAndProvider(
			command.profileId,
			command.providerType
		)

		const authentication = new AuthenticationEntity({
			id: existing?.id ?? command.id,
			profileId: command.profileId,
			providerType: command.providerType,
			scopes: command.scopes,
			grantedAt: command.grantedAt,
			expiresAt: command.expiresAt
		})

		return this.authenticationRepository.save(authentication)
	}
}
