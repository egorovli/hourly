import type { GenerateOAuthAuthorizationRequestCommand } from '../commands/generate-oauth-authorization-request-command.ts'
import type { OAuthAuthorizationRequest } from '../../domain/value-objects/oauth-authorization-request.ts'
import type { OAuthStateService } from '../../domain/services/oauth-state-service.ts'

import { injectable, inject } from 'inversify'

import { InjectionKey } from '../../../../core/ioc/injection-key.enum.ts'

/**
 * GenerateOAuthAuthorizationRequestUseCase - Application Use Case
 *
 * Delegates creation of OAuth authorization requests to the domain-level
 * OAuthStateService while keeping the application boundary explicit.
 */
@injectable()
export class GenerateOAuthAuthorizationRequestUseCase {
	constructor(
		@inject(InjectionKey.OAuthStateService)
		private readonly oauthStateService: OAuthStateService
	) {}

	/**
	 * Generates a new OAuth authorization request and state token.
	 *
	 * @param command - Command describing the provider context
	 * @returns Created OAuthAuthorizationRequest value object
	 */
	async execute(
		command: GenerateOAuthAuthorizationRequestCommand
	): Promise<OAuthAuthorizationRequest> {
		return this.oauthStateService.generateAuthorizationRequest(
			command.providerType,
			command.redirectUri,
			command.scopes,
			command.expiresInSeconds
		)
	}
}
