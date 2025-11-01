import type { ProviderType } from '../../domain/value-objects/provider-type.ts'

/**
 * GenerateOAuthAuthorizationRequestCommand - Command Object
 *
 * Input boundary for generating a new OAuth authorization request with state.
 * Used by the GenerateOAuthAuthorizationRequestUseCase.
 */
export interface GenerateOAuthAuthorizationRequestCommand {
	providerType: ProviderType
	redirectUri: string
	scopes: string[]
	expiresInSeconds?: number
}
