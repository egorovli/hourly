import type { WorklogEntry } from '../entities/worklog-entry.ts'
import type {
	WorklogEntryRepository,
	WorklogEntrySearchCriteria
} from '../repositories/worklog-entry-repository.ts'

import { inject, injectable } from 'inversify'

import { ValidationError } from '../../../../core/errors/validation-error.ts'
import { InjectionKey } from '../../../../core/ioc/injection-key.enum.ts'

export interface ListWorklogEntriesInput {
	projectIds?: string[]
	userIds?: string[]
	dateFrom?: string
	dateTo?: string
	page?: number
	size?: number
}

export interface ListWorklogEntriesOutput {
	entries: WorklogEntry[]
	pageInfo: {
		page: number
		size: number
		total: number
		totalPages: number
		hasNextPage: boolean
	}
}

@injectable()
export class ListWorklogEntriesUseCase {
	constructor(
		@inject(InjectionKey.WorklogEntryRepository)
		private readonly worklogEntryRepository: WorklogEntryRepository
	) {}

	async execute(input: ListWorklogEntriesInput): Promise<ListWorklogEntriesOutput> {
		this.validateInput(input)

		const page = input.page ?? 1
		const size = input.size ?? 12

		const criteria: WorklogEntrySearchCriteria = {
			projectIds: input.projectIds && input.projectIds.length > 0 ? input.projectIds : undefined,
			userIds: input.userIds && input.userIds.length > 0 ? input.userIds : undefined,
			dateFrom: input.dateFrom?.trim() || undefined,
			dateTo: input.dateTo?.trim() || undefined
		}

		const allEntries = await this.worklogEntryRepository.search(criteria)
		const total = allEntries.length

		const offset = (page - 1) * size
		const pageEntries = allEntries.slice(offset, offset + size)

		return {
			entries: pageEntries,
			pageInfo: {
				page,
				size,
				total,
				totalPages: total === 0 ? 0 : Math.ceil(total / size),
				hasNextPage: offset + size < total
			}
		}
	}

	private validateInput(input: ListWorklogEntriesInput): void {
		if (input.page !== undefined && (!Number.isInteger(input.page) || input.page < 1)) {
			throw new ValidationError('Page must be a positive integer')
		}

		if (
			input.size !== undefined &&
			(!Number.isInteger(input.size) || input.size === 0 || input.size > 100)
		) {
			throw new ValidationError('Size must be between 1 and 100')
		}

		if (input.dateFrom && input.dateTo) {
			const fromDate = new Date(input.dateFrom)
			const toDate = new Date(input.dateTo)

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
	}
}
