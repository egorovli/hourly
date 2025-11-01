import type { UserProfileInit } from '../entities/user-profile.ts'

import type { Validator } from '../../../../core/base/validator.ts'

/**
 * UserProfileValidator - Domain Service Interface
 *
 * Defines the contract for validating UserProfile initialization data.
 * Extends the generic Validator interface with UserProfileInit type.
 *
 * This interface belongs to the domain layer and is implemented in the infrastructure layer.
 *
 * Best Practices:
 * - Abstraction: Decouples domain logic from validation implementation
 * - Single Responsibility: Only handles validation logic
 * - Domain Language: Uses domain types (UserProfileInit)
 */
export interface UserProfileValidator extends Validator<UserProfileInit> {}
