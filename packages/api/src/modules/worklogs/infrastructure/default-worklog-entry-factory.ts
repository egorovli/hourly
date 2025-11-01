import { inject, injectable } from 'inversify'

import { ValidationError } from '../../../core/errors/validation-error.ts'
import { InjectionKey } from '../../../core/ioc/injection-key.enum.ts'
import type { IdGenerator } from '../../../core/services/id-generator.ts'
import { WorklogEntry } from '../domain/entities/worklog-entry.ts'
import type { WorklogEntryInit } from '../domain/entities/worklog-entry.ts'
import type {
	WorklogEntryFactory,
	WorklogEntryFactoryInput
} from '../domain/services/worklog-entry-factory.ts'
import type { WorklogEntryValidator } from '../domain/services/worklog-entry-validator.ts'

/**
 * DefaultWorklogEntryFactory - Default implementation of WorklogEntryFactory
 *
 * Provides factory implementation that:
 * - Generates IDs using IdGenerator
 * - Validates data using WorklogEntryValidator
 * - Creates WorklogEntry instances
 *
 * Located in infrastructure layer as it's a specific implementation.
 */
@injectable()
export class DefaultWorklogEntryFactory implements WorklogEntryFactory {
	constructor(
		@inject(InjectionKey.IdGenerator)
		private readonly idGenerator: IdGenerator,
		@inject(InjectionKey.WorklogEntryValidator)
		private readonly validator: WorklogEntryValidator
	) {}

	create(input: WorklogEntryFactoryInput): WorklogEntry {
		const init: WorklogEntryInit = {
			id: this.idGenerator.generate(),
			issueKey: input.issueKey,
			issueId: input.issueId,
			summary: input.summary,
			projectId: input.projectId,
			authorAccountId: input.authorAccountId,
			started: input.started,
			timeSpentSeconds: input.timeSpentSeconds
		}

		return this.createFromInit(init)
	}

	createFromInit(init: WorklogEntryInit): WorklogEntry {
		const result = this.validator.validate(init)

		if (!result.success) {
			throw new ValidationError(result.error ?? 'Invalid worklog entry data')
		}

		if (!result.data) {
			throw new ValidationError('Validation succeeded but no data returned')
		}

		const validated = result.data

		return new WorklogEntry(validated)
	}
}
