import type { ProviderType } from '../value-objects/provider-type.ts'

import { ValidationError } from '../../../../core/errors/validation-error.ts'

/**
 * AuthenticationInit - Properties required to create an Authentication entity
 *
 * Encapsulates all properties needed for Authentication instantiation.
 */
export interface AuthenticationInit {
	id: string
	profileId: string
	providerType: ProviderType
	scopes: string[]
	grantedAt: string
	expiresAt?: string
}

/**
 * Authentication - Domain Entity
 *
 * Represents a user's authenticated connection to an external service provider.
 * Encapsulates business rules and invariants.
 *
 * Best Practices:
 * - Encapsulates both state and behavior
 * - Has unique identity (id - composite of profileId + providerType)
 * - Validates invariants in constructor
 * - Immutable (readonly properties)
 * - Uses parameter object pattern for construction
 */
export class Authentication {
	readonly id: string
	readonly profileId: string
	readonly providerType: ProviderType
	readonly scopes: string[]
	readonly grantedAt: string
	readonly expiresAt?: string

	constructor(init: AuthenticationInit) {
		this.id = init.id
		this.profileId = init.profileId
		this.providerType = init.providerType
		this.scopes = init.scopes
		this.grantedAt = init.grantedAt
		this.expiresAt = init.expiresAt

		this.validate()
	}

	/**
	 * Validates business rules and invariants.
	 * Throws ValidationError if validation fails.
	 */
	private validate(): void {
		if (!this.id || this.id.trim().length === 0) {
			throw new ValidationError('Authentication id is required')
		}

		if (!this.profileId || this.profileId.trim().length === 0) {
			throw new ValidationError('Profile id is required')
		}

		if (!this.providerType) {
			throw new ValidationError('Provider type is required')
		}

		if (!this.scopes || this.scopes.length === 0) {
			throw new ValidationError('OAuth scopes cannot be empty')
		}

		if (!this.grantedAt || this.grantedAt.trim().length === 0) {
			throw new ValidationError('Granted at timestamp is required')
		}

		const grantedAtDate = new Date(this.grantedAt)

		if (Number.isNaN(grantedAtDate.getTime())) {
			throw new ValidationError('Granted at must be a valid ISO 8601 datetime')
		}

		if (this.expiresAt) {
			const expiresAtDate = new Date(this.expiresAt)

			if (Number.isNaN(expiresAtDate.getTime())) {
				throw new ValidationError('Expires at must be a valid ISO 8601 datetime')
			}

			if (expiresAtDate <= grantedAtDate) {
				throw new ValidationError('Expires at must be after granted at')
			}
		}
	}

	/**
	 * Checks if the authentication has expired.
	 *
	 * @param now - Optional current datetime (ISO 8601). Defaults to current time.
	 * @returns True if expired, false otherwise
	 */
	isExpired(now?: string): boolean {
		if (!this.expiresAt) {
			return false
		}

		const nowDate = now ? new Date(now) : new Date()
		const expiresAtDate = new Date(this.expiresAt)

		return nowDate >= expiresAtDate
	}

	/**
	 * Checks if the authentication has a specific scope.
	 *
	 * @param scope - Scope to check
	 * @returns True if scope is granted, false otherwise
	 */
	hasScope(scope: string): boolean {
		return this.scopes.includes(scope)
	}

	/**
	 * Equality comparison based on identity.
	 * Two authentications are equal if they have the same id.
	 */
	equals(other: Authentication): boolean {
		return this.id === other.id
	}
}
