import type { Authentication } from '../entities/authentication.ts'
import type { ProviderType } from '../value-objects/provider-type.ts'

/**
 * AuthenticationRepository - Repository Interface
 *
 * Defines the contract for data access operations on Authentication entities.
 * This interface belongs to the domain layer and is implemented in the infrastructure layer.
 *
 * Best Practices:
 * - Abstraction: Decouples domain logic from data access implementation
 * - Interface Segregation: Only exposes necessary methods
 * - Domain Language: Uses domain entities, not DTOs or provider models
 */
export interface AuthenticationRepository {
	/**
	 * Save an authentication entity.
	 * Creates a new authentication or updates an existing one.
	 *
	 * @param authentication - Authentication entity to save
	 * @returns Promise resolving to saved Authentication entity
	 */
	save(authentication: Authentication): Promise<Authentication>

	/**
	 * Find an authentication by its unique identifier.
	 *
	 * @param id - The authentication identifier
	 * @returns Promise resolving to Authentication entity or null if not found
	 */
	findById(id: string): Promise<Authentication | null>

	/**
	 * Find an authentication by profile ID and provider.
	 *
	 * @param profileId - The profile identifier
	 * @param providerType - The provider type
	 * @returns Promise resolving to Authentication entity or null if not found
	 */
	findByProfileAndProvider(
		profileId: string,
		providerType: ProviderType
	): Promise<Authentication | null>

	/**
	 * Find all authentications for a specific profile.
	 *
	 * @param profileId - The profile identifier
	 * @returns Promise resolving to array of Authentication entities
	 */
	findByProfile(profileId: string): Promise<Authentication[]>

	/**
	 * Find all authentications for a specific provider.
	 *
	 * @param providerType - The provider type
	 * @returns Promise resolving to array of Authentication entities
	 */
	findByProvider(providerType: ProviderType): Promise<Authentication[]>

	/**
	 * Delete an authentication by its unique identifier.
	 *
	 * @param id - The authentication identifier
	 * @returns Promise resolving when deletion is complete
	 */
	delete(id: string): Promise<void>
}
