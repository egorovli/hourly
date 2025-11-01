import type { WorklogEntryRepository } from '../repositories/worklog-entry-repository.ts'
import type { WorklogEntryFactory } from '../../infrastructure/worklog-entry-factory.ts'

import { inject, injectable } from 'inversify'

import { ValidationError } from '../../../../core/errors/validation-error.ts'
import { InjectionKey } from '../../../../core/ioc/injection-key.enum.ts'

export interface SyncWorklogEntryInput {
	issueKey: string
	summary: string
	projectId: string
	authorAccountId: string
	started: string
	timeSpentSeconds: number
}

export interface SyncWorklogEntriesInput {
	entries: SyncWorklogEntryInput[]
	dateFrom: string
	dateTo: string
	authorAccountId: string
}

export interface SyncWorklogEntriesOutput {
	deleted: {
		success: number
		failed: number
		errors: Array<{ entryId: string; error: string }>
	}
	created: {
		success: number
		failed: number
		errors: Array<{ entry: SyncWorklogEntryInput; error: string }>
	}
	totalSuccess: number
	totalFailed: number
}

@injectable()
export class SyncWorklogEntriesUseCase {
	constructor(
		@inject(InjectionKey.WorklogEntryRepository)
		private readonly worklogEntryRepository: WorklogEntryRepository,
		@inject(InjectionKey.WorklogEntryFactory)
		private readonly worklogEntryFactory: WorklogEntryFactory
	) {}

	async execute(input: SyncWorklogEntriesInput): Promise<SyncWorklogEntriesOutput> {
		this.validateInput(input)

		const result: SyncWorklogEntriesOutput = {
			deleted: { success: 0, failed: 0, errors: [] },
			created: { success: 0, failed: 0, errors: [] },
			totalSuccess: 0,
			totalFailed: 0
		}

		// Step 1: Delete all existing worklogs for the author in the date range
		const deleteCriteria = {
			userIds: [input.authorAccountId],
			dateFrom: input.dateFrom,
			dateTo: input.dateTo
		}

		try {
			const deletedCount = await this.worklogEntryRepository.deleteByCriteria(deleteCriteria)
			result.deleted.success = deletedCount
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			result.deleted.failed = 1
			result.deleted.errors.push({
				entryId: 'bulk-delete',
				error: errorMessage
			})
		}

		// Step 2: Create all new worklog entries
		// Note: issueId is not available in SyncWorklogEntryInput as it's resolved externally
		// The repository implementation should handle resolving issueId from issueKey
		for (const entryInput of input.entries) {
			try {
				// The repository needs to resolve issueId from issueKey
				// For now, we'll use issueKey as issueId placeholder - repository should handle this
				const entry = this.worklogEntryFactory.create({
					issueKey: entryInput.issueKey,
					issueId: entryInput.issueKey, // Temporary - repository should resolve this
					summary: entryInput.summary,
					projectId: entryInput.projectId,
					authorAccountId: entryInput.authorAccountId,
					started: entryInput.started,
					timeSpentSeconds: entryInput.timeSpentSeconds
				})

				await this.worklogEntryRepository.create(entry)
				result.created.success++
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error'
				result.created.failed++
				result.created.errors.push({
					entry: entryInput,
					error: errorMessage
				})
			}
		}

		result.totalSuccess = result.deleted.success + result.created.success
		result.totalFailed = result.deleted.failed + result.created.failed

		return result
	}

	private validateInput(input: SyncWorklogEntriesInput): void {
		this.validateEntriesArray(input.entries)
		this.validateDateRange(input.dateFrom, input.dateTo)
		this.validateRequiredString(input.authorAccountId, 'Author account id')

		for (const [index, entry] of input.entries.entries()) {
			this.validateEntry(entry, index)
		}
	}

	private validateEntriesArray(entries: unknown): void {
		if (!Array.isArray(entries)) {
			throw new ValidationError('Entries must be an array')
		}

		if (entries.length > 100) {
			throw new ValidationError('Entries array cannot exceed 100 items')
		}
	}

	private validateDateRange(dateFrom: string, dateTo: string): void {
		this.validateRequiredString(dateFrom, 'Date from')
		this.validateRequiredString(dateTo, 'Date to')

		const fromDate = new Date(dateFrom)
		const toDate = new Date(dateTo)

		if (Number.isNaN(fromDate.getTime())) {
			throw new ValidationError('Invalid dateFrom format')
		}

		if (Number.isNaN(toDate.getTime())) {
			throw new ValidationError('Invalid dateTo format')
		}

		if (fromDate > toDate) {
			throw new ValidationError('dateFrom must be less than or equal to dateTo')
		}
	}

	private validateEntry(entry: SyncWorklogEntryInput, index: number): void {
		this.validateRequiredString(entry.issueKey, `Entry at index ${index}: issueKey`)
		this.validateRequiredString(entry.projectId, `Entry at index ${index}: projectId`)
		this.validateRequiredString(entry.authorAccountId, `Entry at index ${index}: authorAccountId`)
		this.validateRequiredString(entry.started, `Entry at index ${index}: started`)

		if (typeof entry.summary !== 'string') {
			throw new ValidationError(`Entry at index ${index}: summary is required`)
		}

		if (!isValidIsoDateTime(entry.started)) {
			throw new ValidationError(
				`Entry at index ${index}: started must be a valid ISO 8601 datetime string`
			)
		}

		if (typeof entry.timeSpentSeconds !== 'number' || !Number.isInteger(entry.timeSpentSeconds)) {
			throw new ValidationError(`Entry at index ${index}: timeSpentSeconds must be an integer`)
		}

		if (entry.timeSpentSeconds <= 0) {
			throw new ValidationError(`Entry at index ${index}: timeSpentSeconds must be positive`)
		}
	}

	private validateRequiredString(value: unknown, fieldName: string): void {
		if (typeof value !== 'string' || value.trim().length === 0) {
			throw new ValidationError(`${fieldName} is required`)
		}
	}
}

function isValidIsoDateTime(value: string): boolean {
	try {
		const date = new Date(value)
		return !Number.isNaN(date.getTime()) && value.includes('T')
	} catch {
		return false
	}
}
