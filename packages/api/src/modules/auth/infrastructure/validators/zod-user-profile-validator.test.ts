import type { UserProfileInit } from '../../domain/entities/user-profile.ts'
import type { UserProfileValidator } from '../../domain/services/user-profile-validator.ts'

import { expect, test, describe, beforeEach } from 'bun:test'

import { ProviderType } from '../../domain/value-objects/provider-type.ts'

import { ZodUserProfileValidator } from './zod-user-profile-validator.ts'

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

describe('ZodUserProfileValidator', () => {
	let validator: UserProfileValidator

	beforeEach(() => {
		validator = new ZodUserProfileValidator()
	})

	describe('validate', () => {
		test('should validate valid user profile init data', () => {
			const init = createValidUserProfileInit()
			const result = validator.validate(init)

			expect(result.success).toBe(true)
			expect(result.data).toBeDefined()
			expect(result.data?.id).toBe('user-123')
			expect(result.data?.providerType).toBe(ProviderType.WORKLOG_SERVICE)
			expect(result.data?.provider).toBe('jira')
		})

		test('should trim whitespace from string fields', () => {
			const init = createValidUserProfileInit()
			init.id = '  user-123  '
			init.provider = '  jira  '
			init.accountId = '  account-456  '

			const result = validator.validate(init)

			expect(result.success).toBe(true)
			expect(result.data?.id).toBe('user-123')
			expect(result.data?.provider).toBe('jira')
			expect(result.data?.accountId).toBe('account-456')
		})

		test('should accept ISO 8601 datetime strings for dates', () => {
			const init = createValidUserProfileInit()
			init.createdAt = '2024-01-15T10:30:00.000Z' as unknown as Date
			init.updatedAt = '2024-01-15T10:30:00.000Z' as unknown as Date

			const result = validator.validate(init)

			expect(result.success).toBe(true)
			expect(result.data).toBeDefined()
			expect(result.data?.createdAt).toBeInstanceOf(Date)
		})

		test('should validate optional fields when provided', () => {
			const init = createValidUserProfileInit()
			const result = validator.validate(init)

			expect(result.success).toBe(true)
			expect(result.data?.displayName).toBe('John Doe')
			expect(result.data?.email).toBe('john.doe@example.com')
			expect(result.data?.username).toBe('johndoe')
			expect(result.data?.avatarUrl).toBe('https://example.com/avatar.png')
		})

		test('should accept minimal valid data without optional fields', () => {
			const now = new Date()
			const init: UserProfileInit = {
				id: 'user-123',
				providerType: ProviderType.GIT_REPOSITORY,
				provider: 'gitlab',
				accountId: 'account-456',
				createdAt: now,
				updatedAt: now
			}

			const result = validator.validate(init)

			expect(result.success).toBe(true)
			expect(result.data).toBeDefined()
		})

		test('should reject missing required field: id', () => {
			const init = createValidUserProfileInit()
			delete (init as unknown as Partial<UserProfileInit>).id

			const result = validator.validate(init)

			expect(result.success).toBe(false)
			expect(result.error).toContain('id')
		})

		test('should reject empty id', () => {
			const init = createValidUserProfileInit()
			init.id = ''

			const result = validator.validate(init)

			expect(result.success).toBe(false)
			expect(result.error).toContain('id')
		})

		test('should reject invalid provider type', () => {
			const init = createValidUserProfileInit()
			init.providerType = 'INVALID_TYPE' as ProviderType

			const result = validator.validate(init)

			expect(result.success).toBe(false)
			expect(result.error).toContain('Provider type')
		})

		test('should reject invalid email format', () => {
			const init = createValidUserProfileInit()
			init.email = 'invalid-email'

			const result = validator.validate(init)

			expect(result.success).toBe(false)
			expect(result.error).toContain('email')
		})

		test('should reject invalid URL format', () => {
			const init = createValidUserProfileInit()
			init.avatarUrl = 'not-a-url'

			const result = validator.validate(init)

			expect(result.success).toBe(false)
			expect(result.error).toContain('URL')
		})

		test('should reject when updatedAt is before createdAt', () => {
			const init = createValidUserProfileInit()
			init.createdAt = new Date('2024-01-15T10:30:00.000Z')
			init.updatedAt = new Date('2024-01-14T10:30:00.000Z')

			const result = validator.validate(init)

			expect(result.success).toBe(false)
			expect(result.error).toContain('Updated at must be greater than or equal to created at')
		})

		test('should reject invalid date format', () => {
			const init = createValidUserProfileInit()
			init.createdAt = 'invalid-date' as unknown as Date

			const result = validator.validate(init)

			expect(result.success).toBe(false)
			expect(result.error).toContain('date')
		})

		test('should include field path in error message', () => {
			const init = createValidUserProfileInit()
			init.email = 'invalid-email'

			const result = validator.validate(init)

			expect(result.success).toBe(false)
			expect(result.error).toMatch(/^email:/)
		})

		test('should accept valid email without other optional fields', () => {
			const now = new Date()
			const init: UserProfileInit = {
				id: 'user-123',
				providerType: ProviderType.WORKLOG_SERVICE,
				provider: 'jira',
				accountId: 'account-456',
				email: 'user@example.com',
				createdAt: now,
				updatedAt: now
			}

			const result = validator.validate(init)

			expect(result.success).toBe(true)
			expect(result.data?.email).toBe('user@example.com')
		})
	})
})
