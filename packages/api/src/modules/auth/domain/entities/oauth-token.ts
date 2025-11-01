import { ValidationError } from '../../../../core/errors/validation-error.ts'

/**
 * OAuthTokenInit - Properties required to create an OAuthToken entity
 *
 * Encapsulates all properties needed for OAuthToken instantiation.
 */
export interface OAuthTokenInit {
	authenticationId: string
	accessToken: string
	refreshToken?: string
	expiresAt?: string
	tokenType: string
	updatedAt: string
}

/**
 * OAuthToken - Domain Entity
 *
 * Encapsulates OAuth access and refresh tokens for an authentication session.
 * Tokens are stored in plaintext in memory but encrypted at rest (infrastructure concern).
 *
 * Best Practices:
 * - Encapsulates both state and behavior
 * - Has unique identity (authenticationId)
 * - Validates invariants in constructor
 * - Immutable (readonly properties)
 * - Uses parameter object pattern for construction
 */
export class OAuthToken {
	readonly authenticationId: string
	readonly accessToken: string
	readonly refreshToken?: string
	readonly expiresAt?: string
	readonly tokenType: string
	readonly updatedAt: string

	constructor(init: OAuthTokenInit) {
		this.authenticationId = init.authenticationId
		this.accessToken = init.accessToken
		this.refreshToken = init.refreshToken
		this.expiresAt = init.expiresAt
		this.tokenType = init.tokenType
		this.updatedAt = init.updatedAt

		this.validate()
	}

	/**
	 * Validates business rules and invariants.
	 * Throws ValidationError if validation fails.
	 */
	private validate(): void {
		if (!this.authenticationId || this.authenticationId.trim().length === 0) {
			throw new ValidationError('Authentication id is required')
		}

		if (!this.accessToken || this.accessToken.trim().length === 0) {
			throw new ValidationError('Access token is required')
		}

		if (!this.tokenType || this.tokenType.trim().length === 0) {
			throw new ValidationError('Token type is required')
		}

		if (!this.updatedAt || this.updatedAt.trim().length === 0) {
			throw new ValidationError('Updated at timestamp is required')
		}

		const updatedAtDate = new Date(this.updatedAt)

		if (Number.isNaN(updatedAtDate.getTime())) {
			throw new ValidationError('Updated at must be a valid ISO 8601 datetime')
		}

		if (this.expiresAt) {
			const expiresAtDate = new Date(this.expiresAt)

			if (Number.isNaN(expiresAtDate.getTime())) {
				throw new ValidationError('Expires at must be a valid ISO 8601 datetime')
			}
		}
	}

	/**
	 * Checks if the access token has expired.
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
	 * Checks if the token can be refreshed.
	 * Returns true if refreshToken is available.
	 *
	 * @returns True if refreshable, false otherwise
	 */
	canRefresh(): boolean {
		return !!this.refreshToken && this.refreshToken.trim().length > 0
	}

	/**
	 * Checks if the token needs refresh.
	 * Returns true if token is expired or will expire soon.
	 *
	 * @param thresholdSeconds - Optional threshold in seconds before expiry to trigger refresh. Defaults to 300 (5 minutes).
	 * @param now - Optional current datetime (ISO 8601). Defaults to current time.
	 * @returns True if token needs refresh, false otherwise
	 */
	needsRefresh(thresholdSeconds = 300, now?: string): boolean {
		if (!this.expiresAt) {
			return false
		}

		if (!this.canRefresh()) {
			return false
		}

		const nowDate = now ? new Date(now) : new Date()
		const expiresAtDate = new Date(this.expiresAt)
		const thresholdDate = new Date(expiresAtDate.getTime() - thresholdSeconds * 1000)

		return nowDate >= thresholdDate
	}

	/**
	 * Equality comparison based on authenticationId.
	 * Two tokens are equal if they belong to the same authentication.
	 */
	equals(other: OAuthToken): boolean {
		return this.authenticationId === other.authenticationId
	}
}
