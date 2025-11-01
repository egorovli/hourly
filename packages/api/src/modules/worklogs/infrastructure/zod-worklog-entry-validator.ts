import type { ValidationResult } from '../../../core/base/validator.ts'
import type { WorklogEntryInit } from '../domain/entities/worklog-entry.ts'
import type { WorklogEntryValidator } from '../domain/services/worklog-entry-validator.ts'

import { injectable } from 'inversify'
import { z } from 'zod'

/**
 * Zod schema for WorklogEntryInit validation
 */
const worklogEntryInitSchema = z.object({
	id: z.string().min(1, 'Worklog entry id is required'),
	issueKey: z.string().min(1, 'Issue key is required'),
	issueId: z.string().min(1, 'Issue id is required'),
	summary: z.string().min(1, 'Summary is required'),
	projectId: z.string().min(1, 'Project id is required'),
	authorAccountId: z.string().min(1, 'Author account id is required'),
	started: z.string().datetime('Started date must be a valid ISO 8601 datetime string'),
	timeSpentSeconds: z
		.number()
		.int('Time spent seconds must be an integer')
		.positive('Time spent seconds must be positive')
})

/**
 * ZodWorklogEntryValidator - Zod-based implementation of WorklogEntryValidator
 *
 * Provides validation logic for WorklogEntry data using Zod schema validation.
 * This implementation uses Zod for declarative, type-safe validation.
 *
 * Located in infrastructure layer as it's a specific implementation detail.
 */
@injectable()
export class ZodWorklogEntryValidator implements WorklogEntryValidator {
	validate(data: unknown): ValidationResult<WorklogEntryInit> {
		const result = worklogEntryInitSchema.safeParse(data)

		if (!result.success) {
			const errorMessages = result.error.issues.map((err: z.ZodIssue) => {
				const path = err.path.length > 0 ? `${err.path.join('.')}: ` : ''
				return `${path}${err.message}`
			})

			return {
				success: false,
				error: errorMessages.join('; ')
			}
		}

		return {
			success: true,
			data: result.data
		}
	}
}
