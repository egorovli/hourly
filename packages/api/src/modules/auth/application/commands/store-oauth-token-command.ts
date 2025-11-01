/**
 * StoreOAuthTokenCommand - Command Object
 *
 * Carries data required to persist OAuth tokens associated with an authentication.
 * Used by StoreOAuthTokenUseCase to coordinate repository interactions.
 */
export interface StoreOAuthTokenCommand {
	/**
	 * Identifier linking the token to an Authentication aggregate.
	 */
	authenticationId: string
	/**
	 * OAuth access token as issued by the provider.
	 */
	accessToken: string
	/**
	 * Optional OAuth refresh token for renewing the access token.
	 */
	refreshToken?: string
	/**
	 * Optional ISO 8601 timestamp indicating token expiration.
	 */
	expiresAt?: string
	/**
	 * Token type (e.g., "Bearer").
	 */
	tokenType: string
	/**
	 * ISO 8601 timestamp of the last update event.
	 */
	updatedAt: string
}
