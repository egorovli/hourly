import type { ProviderType } from '../../domain/value-objects/provider-type.ts'

/**
 * RegisterUserProfileCommand - Command Object
 *
 * Encapsulates the data required to create or update a user profile.
 * Serves as an input boundary for the RegisterUserProfileUseCase.
 */
export interface RegisterUserProfileCommand {
	/**
	 * Domain identifier for the user profile.
	 * This is typically stable across providers for the same logical user.
	 */
	id: string
	/**
	 * Domain-level provider classification.
	 */
	providerType: ProviderType
	/**
	 * Provider name (e.g., "jira", "gitlab").
	 */
	provider: string
	/**
	 * Provider-specific account identifier.
	 */
	accountId: string
	displayName?: string
	email?: string
	username?: string
	avatarUrl?: string
	providerMetadata?: Record<string, unknown>
	createdAt: Date
	updatedAt: Date
}
