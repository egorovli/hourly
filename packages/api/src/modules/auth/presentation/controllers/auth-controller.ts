import type { RegisterUserProfileCommand } from '../../application/commands/register-user-profile-command.ts'
import type { LinkAuthenticationCommand } from '../../application/commands/link-authentication-command.ts'
import type { StoreOAuthTokenCommand } from '../../application/commands/store-oauth-token-command.ts'
import type { GenerateOAuthAuthorizationRequestCommand } from '../../application/commands/generate-oauth-authorization-request-command.ts'
import type { ValidateOAuthStateCommand } from '../../application/commands/validate-oauth-state-command.ts'
import type { RegisterUserProfileUseCase } from '../../application/use-cases/register-user-profile-use-case.ts'
import type { LinkAuthenticationUseCase } from '../../application/use-cases/link-authentication-use-case.ts'
import type { StoreOAuthTokenUseCase } from '../../application/use-cases/store-oauth-token-use-case.ts'
import type { GenerateOAuthAuthorizationRequestUseCase } from '../../application/use-cases/generate-oauth-authorization-request-use-case.ts'
import type { ValidateOAuthStateUseCase } from '../../application/use-cases/validate-oauth-state-use-case.ts'

import { inject, injectable } from 'inversify'

import { InjectionKey } from '../../../../core/ioc/injection-key.enum.ts'
import {
	AuthenticationViewModel,
	OAuthAuthorizationRequestViewModel,
	OAuthTokenViewModel,
	UserProfileViewModel
} from '../view-models/index.ts'

/**
 * AuthController - Driver-Agnostic Application Controller
 *
 * Serves as the boundary between transport-specific adapters (HTTP, CLI, etc.)
 * and the auth module use cases. Accepts simple request models and returns view
 * models so that multiple transports can reuse the orchestration logic.
 */
@injectable()
export class AuthController {
	constructor(
		@inject(InjectionKey.RegisterUserProfileUseCase)
		private readonly registerUserProfileUseCase: RegisterUserProfileUseCase,

		@inject(InjectionKey.LinkAuthenticationUseCase)
		private readonly linkAuthenticationUseCase: LinkAuthenticationUseCase,

		@inject(InjectionKey.StoreOAuthTokenUseCase)
		private readonly storeOAuthTokenUseCase: StoreOAuthTokenUseCase,

		@inject(InjectionKey.GenerateOAuthAuthorizationRequestUseCase)
		private readonly generateOAuthAuthorizationRequestUseCase: GenerateOAuthAuthorizationRequestUseCase,

		@inject(InjectionKey.ValidateOAuthStateUseCase)
		private readonly validateOAuthStateUseCase: ValidateOAuthStateUseCase
	) {}

	async registerUserProfile(request: RegisterUserProfileCommand): Promise<UserProfileViewModel> {
		const profile = await this.registerUserProfileUseCase.execute(request)
		return UserProfileViewModel.fromDomain(profile)
	}

	async linkAuthentication(request: LinkAuthenticationCommand): Promise<AuthenticationViewModel> {
		const authentication = await this.linkAuthenticationUseCase.execute(request)
		return AuthenticationViewModel.fromDomain(authentication)
	}

	async storeOAuthToken(request: StoreOAuthTokenCommand): Promise<OAuthTokenViewModel> {
		const token = await this.storeOAuthTokenUseCase.execute(request)
		return OAuthTokenViewModel.fromDomain(token)
	}

	async generateOAuthAuthorizationRequest(
		request: GenerateOAuthAuthorizationRequestCommand
	): Promise<OAuthAuthorizationRequestViewModel> {
		const authorizationRequest =
			await this.generateOAuthAuthorizationRequestUseCase.execute(request)
		return OAuthAuthorizationRequestViewModel.fromDomain(authorizationRequest)
	}

	async validateOAuthState(
		request: ValidateOAuthStateCommand
	): Promise<OAuthAuthorizationRequestViewModel> {
		const authorizationRequest = await this.validateOAuthStateUseCase.execute(request)
		return OAuthAuthorizationRequestViewModel.fromDomain(authorizationRequest)
	}
}
