import type { WorklogEntry } from '../../../modules/worklogs/domain/entities/worklog-entry.ts'
import type {
	WorklogEntryRepository,
	WorklogEntrySearchCriteria
} from '../../../modules/worklogs/domain/repositories/worklog-entry-repository.ts'

import { injectable } from 'inversify'

import { sleep } from './sleep.ts'

/**
 * InMemoryWorklogEntryRepository - POC implementation using in-memory storage
 *
 * This is a proof-of-concept implementation that stores worklog entries in memory.
 * All operations include simulated async delays to mimic real-world behavior.
 */
@injectable()
export class InMemoryWorklogEntryRepository implements WorklogEntryRepository {
	private readonly entries = new Map<string, WorklogEntry>()

	async search(criteria: WorklogEntrySearchCriteria): Promise<WorklogEntry[]> {
		await sleep(50) // Simulate network delay

		let results = Array.from(this.entries.values())

		// Filter by projectIds
		if (criteria.projectIds && criteria.projectIds.length > 0) {
			results = results.filter(entry => criteria.projectIds!.includes(entry.projectId))
		}

		// Filter by userIds (authorAccountId)
		if (criteria.userIds && criteria.userIds.length > 0) {
			results = results.filter(entry => criteria.userIds!.includes(entry.authorAccountId))
		}

		// Filter by date range
		if (criteria.dateFrom) {
			const fromDate = new Date(criteria.dateFrom).getTime()
			results = results.filter(entry => {
				const entryDate = new Date(entry.started).getTime()
				return entryDate >= fromDate
			})
		}

		if (criteria.dateTo) {
			const toDate = new Date(criteria.dateTo).getTime()
			results = results.filter(entry => {
				const entryDate = new Date(entry.started).getTime()
				return entryDate <= toDate
			})
		}

		// Sort by started date descending (most recent first)
		results.sort((a, b) => {
			const aTime = new Date(a.started).getTime()
			const bTime = new Date(b.started).getTime()
			return bTime - aTime
		})

		return results
	}

	async create(entry: WorklogEntry): Promise<WorklogEntry> {
		await sleep(100) // Simulate network delay

		this.entries.set(entry.id, entry)
		return entry
	}

	async delete(entryId: string): Promise<void> {
		await sleep(80) // Simulate network delay

		this.entries.delete(entryId)
	}

	async deleteByCriteria(criteria: WorklogEntrySearchCriteria): Promise<number> {
		await sleep(100) // Simulate network delay

		const entriesToDelete = await this.search(criteria)
		const deletedCount = entriesToDelete.length

		for (const entry of entriesToDelete) {
			this.entries.delete(entry.id)
		}

		return deletedCount
	}

	/**
	 * Clear all entries (useful for testing/reset)
	 */
	clear(): void {
		this.entries.clear()
	}

	/**
	 * Get all entries (useful for debugging/testing)
	 */
	getAll(): WorklogEntry[] {
		return Array.from(this.entries.values())
	}
}
