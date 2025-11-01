import type { WorklogEntry } from '../entities/worklog-entry.ts'
import type { WorklogEntryInit } from '../entities/worklog-entry.ts'

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
 * This factory pattern allows injecting services (validator, id generator)
 * via IoC container, keeping entity creation consistent and testable.
 */
export interface WorklogEntryFactory {
	/**
	 * Creates a new WorklogEntry with generated ID and validation
	 *
	 * @param input - WorklogEntry factory input (without id)
	 * @returns A new WorklogEntry instance
	 * @throws ValidationError if validation fails
	 */
	create(input: WorklogEntryFactoryInput): WorklogEntry

	/**
	 * Creates a WorklogEntry from complete init data (with id)
	 *
	 * Useful when creating entities from persisted data where id already exists.
	 *
	 * @param init - Complete WorklogEntryInit data including id
	 * @returns A new WorklogEntry instance
	 * @throws ValidationError if validation fails
	 */
	createFromInit(init: WorklogEntryInit): WorklogEntry
}
