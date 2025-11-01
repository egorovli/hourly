import type { ValidateOAuthStateCommand } from '../commands/validate-oauth-state-command.ts'
import type { OAuthAuthorizationRequest } from '../../domain/value-objects/oauth-authorization-request.ts'
import type { OAuthStateService } from '../../domain/services/oauth-state-service.ts'

import { injectable, inject } from 'inversify'

import { InjectionKey } from '../../../../core/ioc/injection-key.enum.ts'

/**
 * ValidateOAuthStateUseCase - Application Use Case
 *
 * Validates and consumes OAuth state tokens through the domain-level service.
 */
@injectable()
export class ValidateOAuthStateUseCase {
	constructor(
		@inject(InjectionKey.OAuthStateService)
		private readonly oauthStateService: OAuthStateService
	) {}

	/**
	 * Validates and consumes the provided OAuth state token.
	 *
	 * @param command - Command containing the state token
	 * @returns Resolved OAuthAuthorizationRequest value object
	 */
	async execute(command: ValidateOAuthStateCommand): Promise<OAuthAuthorizationRequest> {
		return this.oauthStateService.validateAndConsume(command.state)
	}
}
