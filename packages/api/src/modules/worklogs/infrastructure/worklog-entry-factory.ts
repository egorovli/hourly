import { inject, injectable } from 'inversify'

import { ValidationError } from '../../../core/errors/validation-error.ts'
import { InjectionKey } from '../../../core/ioc/injection-key.enum.ts'
import type { IdGenerator } from '../../../core/services/id-generator.ts'
import { WorklogEntry } from '../domain/entities/worklog-entry.ts'
import type { WorklogEntryInit } from '../domain/entities/worklog-entry.ts'
import type { WorklogEntryValidator } from '../domain/services/worklog-entry-validator.ts'

/**
 * WorklogEntryFactoryInput - Input for creating a worklog entry
 *
 * Similar to WorklogEntryInit but without the id field,
 * as the factory will generate it.
 */
export interface WorklogEntryFactoryInput {
	issueKey: string
	issueId: string
	summary: string
	projectId: string
	authorAccountId: string
	started: string
	timeSpentSeconds: number
}

/**
 * WorklogEntryFactory - Factory for creating WorklogEntry instances
 *
 * Encapsulates the creation logic for WorklogEntry entities, including:
 * - ID generation
 * - Validation
 * - Entity instantiation
 *
 * This factory injects services (validator, id generator) via IoC container,
 * keeping entity creation consistent and testable.
 */
@injectable()
export class WorklogEntryFactory {
	constructor(
		@inject(InjectionKey.IdGenerator)
		private readonly idGenerator: IdGenerator,
		@inject(InjectionKey.WorklogEntryValidator)
		private readonly validator: WorklogEntryValidator
	) {}

	/**
	 * Creates a new WorklogEntry with generated ID and validation
	 *
	 * @param input - WorklogEntry factory input (without id)
	 * @returns A new WorklogEntry instance
	 * @throws ValidationError if validation fails
	 */
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

	/**
	 * Creates a WorklogEntry from complete init data (with id)
	 *
	 * Useful when creating entities from persisted data where id already exists.
	 *
	 * @param init - Complete WorklogEntryInit data including id
	 * @returns A new WorklogEntry instance
	 * @throws ValidationError if validation fails
	 */
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
