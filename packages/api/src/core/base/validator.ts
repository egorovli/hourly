/**
 * ValidationResult - Result of validation operation
 *
 * @template T - The validated type
 */
export interface ValidationResult<T> {
	/**
	 * Whether validation succeeded
	 */
	success: boolean

	/**
	 * Validated data (only present if success is true)
	 */
	data?: T

	/**
	 * Validation error message (only present if success is false)
	 */
	error?: string
}

/**
 * Validator - Generic Validator Interface
 *
 * Base interface for all validators in the system.
 * Provides a generic contract for validating data of any type.
 *
 * Best Practices:
 * - Generic: Works with any type T
 * - Abstraction: Decouples domain logic from validation implementation
 * - Single Responsibility: Only handles validation logic
 * - Safe validation: Always returns ValidationResult, never throws
 *
 * @template T - The type being validated
 */
export interface Validator<T> {
	/**
	 * Validates data of type T.
	 * Always returns ValidationResult without throwing exceptions.
	 *
	 * @param data - Data to validate (unknown type for flexibility)
	 * @returns Validation result with validated data or error
	 */
	validate(data: unknown): ValidationResult<T>
}
