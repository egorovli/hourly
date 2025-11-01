import type { ProviderType } from './provider-type.ts'

import { ValidationError } from '../../../../core/errors/validation-error.ts'

/**
 * OAuthAuthorizationRequestInit - Properties required to create an OAuthAuthorizationRequest
 *
 * Encapsulates all properties needed for OAuthAuthorizationRequest instantiation.
 */
export interface OAuthAuthorizationRequestInit {
	state: string
	providerType: ProviderType
	redirectUri: string
	scopes: string[]
	createdAt: string
	expiresAt: string
}

/**
 * OAuthAuthorizationRequest - OAuth Authorization Request Value Object
 *
 * Represents an in-flight OAuth authorization request (state management).
 * Used for CSRF protection and OAuth flow state tracking.
 *
 * Best Practices:
 * - Immutable value object
 * - Validates invariants in constructor
 * - Encapsulates business rules for state management
 */
export class OAuthAuthorizationRequest {
	readonly state: string
	readonly providerType: ProviderType
	readonly redirectUri: string
	readonly scopes: string[]
	readonly createdAt: string
	readonly expiresAt: string

	constructor(init: OAuthAuthorizationRequestInit) {
		this.state = init.state
		this.providerType = init.providerType
		this.redirectUri = init.redirectUri
		this.scopes = init.scopes
		this.createdAt = init.createdAt
		this.expiresAt = init.expiresAt

		this.validate()
	}

	/**
	 * Validates business rules and invariants.
	 * Throws ValidationError if validation fails.
	 */
	private validate(): void {
		if (!this.state || this.state.trim().length === 0) {
			throw new ValidationError('OAuth state cannot be empty')
		}

		if (!this.providerType) {
			throw new ValidationError('Provider type is required')
		}

		if (!this.redirectUri || this.redirectUri.trim().length === 0) {
			throw new ValidationError('Redirect URI is required')
		}

		try {
			new URL(this.redirectUri)
		} catch {
			throw new ValidationError('Redirect URI must be a valid URL')
		}

		if (!this.scopes || this.scopes.length === 0) {
			throw new ValidationError('OAuth scopes cannot be empty')
		}

		if (!this.createdAt || this.createdAt.trim().length === 0) {
			throw new ValidationError('Created at timestamp is required')
		}

		if (!this.expiresAt || this.expiresAt.trim().length === 0) {
			throw new ValidationError('Expires at timestamp is required')
		}

		const createdAtDate = new Date(this.createdAt)
		const expiresAtDate = new Date(this.expiresAt)

		if (Number.isNaN(createdAtDate.getTime())) {
			throw new ValidationError('Created at must be a valid ISO 8601 datetime')
		}

		if (Number.isNaN(expiresAtDate.getTime())) {
			throw new ValidationError('Expires at must be a valid ISO 8601 datetime')
		}

		if (expiresAtDate <= createdAtDate) {
			throw new ValidationError('Expires at must be after created at')
		}
	}

	/**
	 * Checks if the authorization request has expired.
	 *
	 * @param now - Optional current datetime (ISO 8601). Defaults to current time.
	 * @returns True if expired, false otherwise
	 */
	isExpired(now?: string): boolean {
		const nowDate = now ? new Date(now) : new Date()
		const expiresAtDate = new Date(this.expiresAt)

		return nowDate >= expiresAtDate
	}

	/**
	 * Equality comparison based on state.
	 * Two authorization requests are equal if they have the same state.
	 */
	equals(other: OAuthAuthorizationRequest): boolean {
		return this.state === other.state
	}
}
