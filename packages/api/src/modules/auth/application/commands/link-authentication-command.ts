import type { ProviderType } from '../../domain/value-objects/provider-type.ts'

/**
 * LinkAuthenticationCommand - Command Object
 *
 * Describes the data required to create or update an Authentication aggregate.
 * Used by the LinkAuthenticationUseCase to orchestrate repository operations.
 */
export interface LinkAuthenticationCommand {
	/**
	 * Unique identifier for the authentication record.
	 * May be a composite of profile and provider identifiers.
	 */
	id: string
	/**
	 * Identifier of the owning user profile.
	 */
	profileId: string
	/**
	 * Domain-level provider classification.
	 */
	providerType: ProviderType
	/**
	 * OAuth scopes granted for this authentication context.
	 */
	scopes: string[]
	/**
	 * ISO 8601 timestamp indicating when the authorization was granted.
	 */
	grantedAt: string
	/**
	 * Optional ISO 8601 expiration timestamp.
	 */
	expiresAt?: string
}
