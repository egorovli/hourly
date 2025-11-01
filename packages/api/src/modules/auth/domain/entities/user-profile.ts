import type { UserProfileValidator } from '../services/user-profile-validator.ts'
import type { ProviderType } from '../value-objects/provider-type.ts'

import { ValidationError } from '../../../../core/errors/validation-error.ts'

/**
 * UserProfileInit - Properties required to create a UserProfile entity
 *
 * Encapsulates all properties needed for UserProfile instantiation.
 * This is a loose interface - actual validation is performed by UserProfileValidator.
 */
export interface UserProfileInit {
	id: string
	providerType: ProviderType
	provider: string
	accountId: string
	displayName?: string
	email?: string
	username?: string
	avatarUrl?: string
	providerMetadata?: Record<string, unknown>
	createdAt: Date
	updatedAt: Date
}

/**
 * UserProfile - Domain Entity
 *
 * Represents a user's identity/profile information from an OAuth provider.
 * Encapsulates business rules and invariants.
 *
 * Properties:
 * - `providerType`: Domain-level abstraction (WORKLOG_SERVICE, GIT_REPOSITORY)
 * - `provider`: Concrete provider name (e.g., "gitlab", "github", "jira", "atlassian")
 *
 * Best Practices:
 * - Encapsulates both state and behavior
 * - Has unique identity (id + providerType composite key)
 * - Validates invariants in constructor
 * - Immutable (readonly properties)
 * - Uses parameter object pattern for construction
 */
export class UserProfile {
	readonly id: string
	readonly providerType: ProviderType
	readonly provider: string
	readonly accountId: string
	readonly displayName?: string
	readonly email?: string
	readonly username?: string
	readonly avatarUrl?: string
	readonly providerMetadata: Record<string, unknown>
	readonly createdAt: Date
	readonly updatedAt: Date

	constructor(init: UserProfileInit, validator: UserProfileValidator) {
		// Validate using validator and assign properties
		const validated = this.validate(init, validator)

		this.id = validated.id
		this.providerType = validated.providerType
		this.provider = validated.provider
		this.accountId = validated.accountId
		this.displayName = validated.displayName
		this.email = validated.email
		this.username = validated.username
		this.avatarUrl = validated.avatarUrl
		this.providerMetadata = validated.providerMetadata ?? {}
		this.createdAt = validated.createdAt
		this.updatedAt = validated.updatedAt
	}

	/**
	 * Validates UserProfile initialization data using the provided validator.
	 *
	 * @param init - UserProfileInit data to validate
	 * @param validator - UserProfileValidator service instance
	 * @returns Validated UserProfileInit data
	 * @throws ValidationError if validation fails
	 */
	validate(init: UserProfileInit, validator: UserProfileValidator): UserProfileInit {
		const validationResult = validator.validate(init)

		if (!validationResult.success) {
			throw new ValidationError(validationResult.error || 'UserProfile validation failed')
		}

		if (!validationResult.data) {
			throw new ValidationError('UserProfile validation failed: no data returned')
		}

		return validationResult.data
	}

	/**
	 * Equality comparison based on identity (id + providerType composite key).
	 * Two profiles are equal if they have the same id and providerType.
	 */
	equals(other: UserProfile): boolean {
		return this.id === other.id && this.providerType === other.providerType
	}

	/**
	 * Checks if this profile can be matched with another profile.
	 * Matching is done by accountId, email, or username across providers.
	 *
	 * @param other - Other UserProfile to match against
	 * @returns True if profiles can be matched, false otherwise
	 */
	canMatch(other: UserProfile): boolean {
		if (this.equals(other)) {
			return true
		}

		// Match by accountId
		if (this.accountId && other.accountId && this.accountId === other.accountId) {
			return true
		}

		// Match by email
		if (this.email && other.email && this.email === other.email) {
			return true
		}

		// Match by username (if available)
		if (this.username && other.username && this.username === other.username) {
			return true
		}

		return false
	}
}
