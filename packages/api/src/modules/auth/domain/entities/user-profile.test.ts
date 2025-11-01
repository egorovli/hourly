import type { UserProfileInit } from '../../domain/entities/user-profile.ts'
import type { UserProfileValidator } from '../../domain/services/user-profile-validator.ts'

import { expect, test, describe, beforeEach } from 'bun:test'

import { ProviderType } from '../../domain/value-objects/provider-type.ts'

import { ValidationError } from '../../../../core/errors/validation-error.ts'

import { UserProfile } from '../../domain/entities/user-profile.ts'
import { ZodUserProfileValidator } from '../../infrastructure/validators/zod-user-profile-validator.ts'
import { UserProfileFactory } from '../../domain/factories/user-profile-factory.ts'

/**
 * Creates a valid UserProfileInit object for testing.
 */
function createValidUserProfileInit(): UserProfileInit {
	const now = new Date()
	return {
		id: 'user-123',
		providerType: ProviderType.WORKLOG_SERVICE,
		provider: 'jira',
		accountId: 'account-456',
		displayName: 'John Doe',
		email: 'john.doe@example.com',
		username: 'johndoe',
		avatarUrl: 'https://example.com/avatar.png',
		providerMetadata: { customField: 'value' },
		createdAt: now,
		updatedAt: now
	}
}

describe('UserProfile', () => {
	let validator: UserProfileValidator

	beforeEach(() => {
		validator = new ZodUserProfileValidator()
	})

	describe('constructor', () => {
		test('should create UserProfile with valid data', () => {
			const init = createValidUserProfileInit()
			const profile = new UserProfile(init, validator)

			expect(profile.id).toBe('user-123')
			expect(profile.providerType).toBe(ProviderType.WORKLOG_SERVICE)
			expect(profile.provider).toBe('jira')
			expect(profile.accountId).toBe('account-456')
		})

		test('should throw ValidationError for invalid data', () => {
			const init = createValidUserProfileInit()
			init.id = ''

			expect(() => {
				new UserProfile(init, validator)
			}).toThrow(ValidationError)
		})

		test('should trim whitespace and create valid profile', () => {
			const init = createValidUserProfileInit()
			init.id = '  user-123  '
			init.provider = '  jira  '

			const profile = new UserProfile(init, validator)

			expect(profile.id).toBe('user-123')
			expect(profile.provider).toBe('jira')
		})

		test('should set default empty object for providerMetadata', () => {
			const init = createValidUserProfileInit()
			delete (init as unknown as Partial<UserProfileInit>).providerMetadata

			const profile = new UserProfile(init, validator)

			expect(profile.providerMetadata).toEqual({})
		})
	})

	describe('equals', () => {
		test('should return true for profiles with same id and providerType', () => {
			const init1 = createValidUserProfileInit()
			const init2 = createValidUserProfileInit()
			init2.accountId = 'different-account'

			const profile1 = new UserProfile(init1, validator)
			const profile2 = new UserProfile(init2, validator)

			expect(profile1.equals(profile2)).toBe(true)
		})

		test('should return false for profiles with different id', () => {
			const init1 = createValidUserProfileInit()
			const init2 = createValidUserProfileInit()
			init2.id = 'different-id'

			const profile1 = new UserProfile(init1, validator)
			const profile2 = new UserProfile(init2, validator)

			expect(profile1.equals(profile2)).toBe(false)
		})

		test('should return false for profiles with different providerType', () => {
			const init1 = createValidUserProfileInit()
			const init2 = createValidUserProfileInit()
			init2.providerType = ProviderType.GIT_REPOSITORY

			const profile1 = new UserProfile(init1, validator)
			const profile2 = new UserProfile(init2, validator)

			expect(profile1.equals(profile2)).toBe(false)
		})
	})

	describe('canMatch', () => {
		test('should return true for equal profiles', () => {
			const init = createValidUserProfileInit()
			const profile1 = new UserProfile(init, validator)
			const profile2 = new UserProfile(init, validator)

			expect(profile1.canMatch(profile2)).toBe(true)
		})

		test('should return true for profiles with same accountId', () => {
			const init1 = createValidUserProfileInit()
			const init2 = createValidUserProfileInit()
			init2.id = 'different-id'
			init2.providerType = ProviderType.GIT_REPOSITORY

			const profile1 = new UserProfile(init1, validator)
			const profile2 = new UserProfile(init2, validator)

			expect(profile1.canMatch(profile2)).toBe(true)
		})

		test('should return true for profiles with same email', () => {
			const init1 = createValidUserProfileInit()
			const init2 = createValidUserProfileInit()
			init2.id = 'different-id'
			init2.accountId = 'different-account'
			init2.providerType = ProviderType.GIT_REPOSITORY

			const profile1 = new UserProfile(init1, validator)
			const profile2 = new UserProfile(init2, validator)

			expect(profile1.canMatch(profile2)).toBe(true)
		})

		test('should return true for profiles with same username', () => {
			const init1 = createValidUserProfileInit()
			const init2 = createValidUserProfileInit()
			init2.id = 'different-id'
			init2.accountId = 'different-account'
			init2.email = 'different@example.com'
			init2.providerType = ProviderType.GIT_REPOSITORY

			const profile1 = new UserProfile(init1, validator)
			const profile2 = new UserProfile(init2, validator)

			expect(profile1.canMatch(profile2)).toBe(true)
		})

		test('should return false for profiles with no matching identifiers', () => {
			const init1 = createValidUserProfileInit()
			const init2 = createValidUserProfileInit()
			init2.id = 'different-id'
			init2.accountId = 'different-account'
			init2.email = 'different@example.com'
			init2.username = 'different-username'
			init2.providerType = ProviderType.GIT_REPOSITORY

			const profile1 = new UserProfile(init1, validator)
			const profile2 = new UserProfile(init2, validator)

			expect(profile1.canMatch(profile2)).toBe(false)
		})

		test('should return false when matching identifiers are missing', () => {
			const init1 = createValidUserProfileInit()
			delete (init1 as unknown as Partial<UserProfileInit>).email
			delete (init1 as unknown as Partial<UserProfileInit>).username

			const init2 = createValidUserProfileInit()
			init2.id = 'different-id'
			init2.accountId = 'different-account'
			init2.providerType = ProviderType.GIT_REPOSITORY

			const profile1 = new UserProfile(init1, validator)
			const profile2 = new UserProfile(init2, validator)

			expect(profile1.canMatch(profile2)).toBe(false)
		})
	})
})

describe('UserProfileFactory', () => {
	let validator: UserProfileValidator
	let factory: UserProfileFactory

	beforeEach(() => {
		validator = new ZodUserProfileValidator()
		factory = new UserProfileFactory(validator)
	})

	test('should create UserProfile using factory', () => {
		const init = createValidUserProfileInit()
		const profile = factory.create(init)

		expect(profile).toBeInstanceOf(UserProfile)
		expect(profile.id).toBe('user-123')
		expect(profile.providerType).toBe(ProviderType.WORKLOG_SERVICE)
	})

	test('should throw ValidationError when creating with invalid data', () => {
		const init = createValidUserProfileInit()
		init.id = ''

		expect(() => {
			factory.create(init)
		}).toThrow(ValidationError)
	})

	test('should create multiple profiles with same factory instance', () => {
		const init1 = createValidUserProfileInit()
		const init2 = createValidUserProfileInit()
		init2.id = 'user-456'

		const profile1 = factory.create(init1)
		const profile2 = factory.create(init2)

		expect(profile1.id).toBe('user-123')
		expect(profile2.id).toBe('user-456')
		expect(profile1.equals(profile2)).toBe(false)
	})
})
