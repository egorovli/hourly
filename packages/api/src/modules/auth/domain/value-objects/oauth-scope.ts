import { ValidationError } from '../../../../core/errors/validation-error.ts'

/**
 * OAuthScope - OAuth Scope Value Object
 *
 * Represents a single OAuth scope value.
 * Encapsulates validation logic for OAuth scope strings.
 *
 * Best Practices:
 * - Immutable value object
 * - Validates invariants in constructor
 * - Provides equality comparison
 */
export class OAuthScope {
	readonly value: string

	constructor(value: string) {
		this.value = value
		this.validate()
	}

	/**
	 * Validates that the scope value is not empty.
	 * Throws ValidationError if validation fails.
	 */
	private validate(): void {
		if (!this.value || this.value.trim().length === 0) {
			throw new ValidationError('OAuth scope cannot be empty')
		}
	}

	/**
	 * Equality comparison based on value.
	 * Two scopes are equal if they have the same value.
	 */
	equals(other: OAuthScope): boolean {
		return this.value === other.value
	}

	/**
	 * Returns the string representation of the scope.
	 */
	toString(): string {
		return this.value
	}
}
