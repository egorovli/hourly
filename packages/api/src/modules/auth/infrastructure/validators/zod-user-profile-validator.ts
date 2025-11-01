import type { UserProfileInit } from '../../domain/entities/user-profile.ts'
import type { UserProfileValidator } from '../../domain/services/user-profile-validator.ts'
import type { ValidationResult } from '../../../../core/base/validator.ts'

import { z } from 'zod'

import { ProviderType } from '../../domain/value-objects/provider-type.ts'

/**
 * UserProfileInitSchema - Zod schema for UserProfileInit validation
 *
 * Comprehensive validation schema that enforces all business rules:
 * - Required fields: id, providerType, provider, accountId, createdAt, updatedAt
 * - Optional fields: displayName, email, username, avatarUrl, providerMetadata
 * - Business rules:
 *   - At least one identifier (id, accountId, email, or username) must be present
 *   - Email must be valid format if provided
 *   - Avatar URL must be valid URL if provided
 *   - CreatedAt and updatedAt must be valid ISO 8601 datetime strings or Date objects
 *   - Provider name must be non-empty
 */
const userProfileInitSchema = z
	.object({
		id: z
			.string({
				error: iss => (iss.code === 'invalid_type' ? 'User profile id must be a string' : undefined)
			})
			.min(1, { error: 'User profile id cannot be empty' })
			.trim(),

		providerType: z.enum(ProviderType, {
			error: `Provider type must be one of: ${Object.values(ProviderType).join(', ')}`
		}),

		provider: z
			.string({
				error: iss => (iss.code === 'invalid_type' ? 'Provider name must be a string' : undefined)
			})
			.min(1, { error: 'Provider name cannot be empty' })
			.trim(),

		accountId: z
			.string({
				error: iss => (iss.code === 'invalid_type' ? 'Account id must be a string' : undefined)
			})
			.min(1, { error: 'Account id cannot be empty' })
			.trim(),

		displayName: z
			.string({
				error: iss => (iss.code === 'invalid_type' ? 'Display name must be a string' : undefined)
			})
			.trim()
			.optional(),

		email: z
			.email({
				error: 'Email must be a valid email address (e.g., user@example.com)'
			})
			.optional(),

		username: z
			.string({
				error: iss => (iss.code === 'invalid_type' ? 'Username must be a string' : undefined)
			})
			.trim()
			.optional(),

		avatarUrl: z
			.url({
				error: 'Avatar URL must be a valid URL (e.g., https://example.com/avatar.png)'
			})
			.optional(),

		providerMetadata: z
			.record(z.string(), z.unknown(), {
				error: 'Provider metadata must be an object with string keys'
			})
			.optional(),

		createdAt: z.coerce.date({
			error: iss =>
				iss.code === 'invalid_type'
					? 'Created at must be a valid date or ISO 8601 datetime string'
					: undefined
		}),

		updatedAt: z.coerce.date({
			error: iss =>
				iss.code === 'invalid_type'
					? 'Updated at must be a valid date or ISO 8601 datetime string'
					: undefined
		})
	})
	.refine(
		data => {
			// At least one identifier must be present
			return !!(data.id || data.accountId || data.email || data.username)
		},
		{
			error: 'At least one identifier (id, accountId, email, or username) must be present',
			path: ['id'] // Attach error to id field for better UX
		}
	)
	.refine(
		data => {
			// Validate that createdAt and updatedAt are valid dates
			const createdAtDate =
				data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt)

			const updatedAtDate =
				data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt)

			return !Number.isNaN(createdAtDate.getTime()) && !Number.isNaN(updatedAtDate.getTime())
		},
		{
			error: 'Created at and updated at must be valid dates',
			path: ['createdAt']
		}
	)
	.refine(
		data => {
			// Validate that updatedAt is not before createdAt
			const createdAtDate =
				data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt)

			const updatedAtDate =
				data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt)

			return updatedAtDate >= createdAtDate
		},
		{
			error: 'Updated at must be greater than or equal to created at',
			path: ['updatedAt']
		}
	)

/**
 * ZodUserProfileValidator - Infrastructure Implementation
 *
 * Concrete implementation of UserProfileValidator using Zod.
 * This belongs to the infrastructure layer but implements the domain interface.
 *
 * Best Practices:
 * - Implements domain interface
 * - Uses Zod for schema validation
 * - Provides clear error messages
 * - Safe validation: Always returns ValidationResult, never throws
 */
export class ZodUserProfileValidator implements UserProfileValidator {
	validate(init: unknown): ValidationResult<UserProfileInit> {
		const result = userProfileInitSchema.safeParse(init)

		if (!result.success) {
			// Use Zod's prettifyError for better formatting, or extract first error with context
			const firstError = result.error.issues[0]
			let errorMessage = firstError?.message || 'Validation failed'

			// Enhance error message with field context if available
			if (firstError?.path && firstError.path.length > 0) {
				const fieldPath = firstError.path.join('.')
				errorMessage = `${fieldPath}: ${errorMessage}`
			}

			return {
				success: false,
				error: errorMessage
			}
		}

		return {
			success: true,
			data: result.data
		}
	}
}
