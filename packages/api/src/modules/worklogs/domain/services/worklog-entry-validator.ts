import type { Validator, ValidationResult } from '../../../../core/base/validator.ts'
import type { WorklogEntryInit } from '../entities/worklog-entry.ts'

/**
 * WorklogEntryValidator - Interface for validating WorklogEntry data
 *
 * Decouples validation logic from the WorklogEntry entity, allowing
 * validation to be reused across different contexts (entity creation,
 * use case inputs, API validation, etc.).
 *
 * Supports different implementations for different validation strategies.
 */
export interface WorklogEntryValidator extends Validator<WorklogEntryInit> {
	/**
	 * Validates WorklogEntryInit data
	 *
	 * @param data - WorklogEntry initialization data to validate
	 * @returns Validation result with validated data or error message
	 */
	validate(data: unknown): ValidationResult<WorklogEntryInit>
}
