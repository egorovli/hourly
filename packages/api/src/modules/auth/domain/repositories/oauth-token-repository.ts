import type { OAuthToken } from '../entities/oauth-token.ts'

/**
 * OAuthTokenRepository - Repository Interface
 *
 * Defines the contract for data access operations on OAuthToken entities.
 * This interface belongs to the domain layer and is implemented in the infrastructure layer.
 *
 * Best Practices:
 * - Abstraction: Decouples domain logic from data access implementation
 * - Interface Segregation: Only exposes necessary methods
 * - Domain Language: Uses domain entities, not DTOs or provider models
 * - Security: Repository implementation should handle token encryption/decryption
 */
export interface OAuthTokenRepository {
	/**
	 * Save an OAuth token entity.
	 * Creates a new token or updates an existing one.
	 * Tokens should be encrypted before storage (infrastructure concern).
	 *
	 * @param token - OAuthToken entity to save
	 * @returns Promise resolving to saved OAuthToken entity
	 */
	save(token: OAuthToken): Promise<OAuthToken>

	/**
	 * Find an OAuth token by authentication ID.
	 *
	 * @param authenticationId - The authentication identifier
	 * @returns Promise resolving to OAuthToken entity or null if not found
	 */
	findByAuthenticationId(authenticationId: string): Promise<OAuthToken | null>

	/**
	 * Delete an OAuth token by authentication ID.
	 *
	 * @param authenticationId - The authentication identifier
	 * @returns Promise resolving when deletion is complete
	 */
	deleteByAuthenticationId(authenticationId: string): Promise<void>
}

