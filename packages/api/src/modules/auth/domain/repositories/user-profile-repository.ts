import type { ProviderType } from '../value-objects/provider-type.ts'
import type { UserProfile } from '../entities/user-profile.ts'

/**
 * UserProfileRepository - Repository Interface
 *
 * Defines the contract for data access operations on UserProfile entities.
 * This interface belongs to the domain layer and is implemented in the infrastructure layer.
 *
 * Best Practices:
 * - Abstraction: Decouples domain logic from data access implementation
 * - Interface Segregation: Only exposes necessary methods
 * - Domain Language: Uses domain entities, not DTOs or provider models
 */
export interface UserProfileRepository {
	/**
	 * Save a user profile entity.
	 * Creates a new profile or updates an existing one (upsert).
	 *
	 * @param profile - UserProfile entity to save
	 * @returns Promise resolving to saved UserProfile entity
	 */
	save(profile: UserProfile): Promise<UserProfile>

	/**
	 * Find a user profile by its unique identifier (id + providerType composite key).
	 *
	 * @param id - The profile identifier
	 * @param providerType - The provider type
	 * @returns Promise resolving to UserProfile entity or null if not found
	 */
	findById(id: string, providerType: ProviderType): Promise<UserProfile | null>

	/**
	 * Find all profiles for a specific provider.
	 *
	 * @param providerType - The provider type
	 * @returns Promise resolving to array of UserProfile entities
	 */
	findByProvider(providerType: ProviderType): Promise<UserProfile[]>

	/**
	 * Find profiles that can be matched with the given profile.
	 * Matching is done by accountId, email, or username across providers.
	 *
	 * @param profile - UserProfile to match against
	 * @returns Promise resolving to array of matching UserProfile entities
	 */
	findMatchingProfiles(profile: UserProfile): Promise<UserProfile[]>

	/**
	 * Delete a user profile by its unique identifier.
	 *
	 * @param id - The profile identifier
	 * @param providerType - The provider type
	 * @returns Promise resolving when deletion is complete
	 */
	delete(id: string, providerType: ProviderType): Promise<void>
}

