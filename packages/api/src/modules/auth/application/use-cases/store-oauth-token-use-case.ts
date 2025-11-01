import type { StoreOAuthTokenCommand } from '../commands/store-oauth-token-command.ts'
import type { AuthenticationRepository } from '../../domain/repositories/authentication-repository.ts'
import type { OAuthToken } from '../../domain/entities/oauth-token.ts'
import type { OAuthTokenRepository } from '../../domain/repositories/oauth-token-repository.ts'

import { injectable, inject } from 'inversify'

import { BusinessRuleError } from '../../../../core/errors/business-rule-error.ts'
import { InjectionKey } from '../../../../core/ioc/injection-key.enum.ts'
import { OAuthToken as OAuthTokenEntity } from '../../domain/entities/oauth-token.ts'

/**
 * StoreOAuthTokenUseCase - Application Use Case
 *
 * Persists OAuth tokens associated with an authentication while ensuring
 * the owning authentication aggregate exists.
 */
@injectable()
export class StoreOAuthTokenUseCase {
	constructor(
		@inject(InjectionKey.AuthenticationRepository)
		private readonly authenticationRepository: AuthenticationRepository,

		@inject(InjectionKey.OAuthTokenRepository)
		private readonly oauthTokenRepository: OAuthTokenRepository
	) {}

	/**
	 * Executes the store OAuth token orchestration.
	 *
	 * @param command - Command describing the token payload
	 * @returns Persisted OAuthToken entity
	 * @throws BusinessRuleError when the owning authentication is missing
	 */
	async execute(command: StoreOAuthTokenCommand): Promise<OAuthToken> {
		const authentication = await this.authenticationRepository.findById(command.authenticationId)

		if (!authentication) {
			throw new BusinessRuleError(
				`Cannot store OAuth token: authentication ${command.authenticationId} not found`
			)
		}

		const token = new OAuthTokenEntity({
			authenticationId: command.authenticationId,
			accessToken: command.accessToken,
			refreshToken: command.refreshToken,
			expiresAt: command.expiresAt,
			tokenType: command.tokenType,
			updatedAt: command.updatedAt
		})

		return this.oauthTokenRepository.save(token)
	}
}
