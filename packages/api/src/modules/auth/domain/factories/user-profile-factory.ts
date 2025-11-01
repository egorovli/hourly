import type { UserProfileInit } from '../entities/user-profile.ts'
import type { UserProfileValidator } from '../services/user-profile-validator.ts'

import { injectable, inject } from 'inversify'

import { InjectionKey } from '../../../../core/ioc/injection-key.enum.ts'

import { UserProfile } from '../entities/user-profile.ts'

/**
 * UserProfileFactory - Domain Factory Service
 *
 * Factory for creating UserProfile entities with injected validator.
 * This service is injectable and handles the creation of UserProfile instances.
 *
 * Best Practices:
 * - Encapsulates entity creation logic
 * - Has validator injected via DI
 * - Single Responsibility: Creates UserProfile instances
 */
@injectable()
export class UserProfileFactory {
	constructor(
		@inject(InjectionKey.UserProfileValidator)
		private readonly validator: UserProfileValidator
	) {}

	/**
	 * Creates a new UserProfile instance with validation.
	 *
	 * @param init - UserProfileInit data
	 * @returns Validated UserProfile instance
	 * @throws ValidationError if validation fails
	 */
	create(init: UserProfileInit): UserProfile {
		return new UserProfile(init, this.validator)
	}
}

