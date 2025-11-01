import type { OAuthAuthorizationRequest } from '../value-objects/oauth-authorization-request.ts'
import type { ProviderType } from '../value-objects/provider-type.ts'

/**
 * OAuthStateService - Domain Service Interface
 *
 * Defines the contract for OAuth state management.
 * Handles generation, validation, and storage of OAuth state tokens for CSRF protection.
 *
 * This is a domain service because it encapsulates business logic about OAuth state:
 * - State tokens must be cryptographically random
 * - State tokens must expire within a reasonable timeframe
 * - State tokens must be unique
 *
 * The implementation (infrastructure) handles the actual storage mechanism (memory, Redis, database).
 */
export interface OAuthStateService {
	/**
	 * Generate a new OAuth authorization request with a cryptographically random state token.
	 *
	 * @param providerType - Provider type
	 * @param redirectUri - Callback URI
	 * @param scopes - Requested OAuth scopes
	 * @param expiresInSeconds - Optional expiration time in seconds. Defaults to 15 minutes (900 seconds).
	 * @returns Promise resolving to OAuthAuthorizationRequest with generated state
	 */
	generateAuthorizationRequest(
		providerType: ProviderType,
		redirectUri: string,
		scopes: string[],
		expiresInSeconds?: number
	): Promise<OAuthAuthorizationRequest>

	/**
	 * Validate and consume an OAuth state token.
	 * This method validates the state token and removes it from storage (one-time use).
	 *
	 * @param state - OAuth state token to validate
	 * @returns Promise resolving to OAuthAuthorizationRequest if valid
	 * @throws Error if state is invalid, expired, or already consumed
	 */
	validateAndConsume(state: string): Promise<OAuthAuthorizationRequest>

	/**
	 * Check if a state token is valid without consuming it.
	 *
	 * @param state - OAuth state token to check
	 * @returns Promise resolving to true if valid, false otherwise
	 */
	isValid(state: string): Promise<boolean>
}
