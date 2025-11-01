import type { WorklogEntry } from '../entities/worklog-entry.ts'

export interface WorklogEntrySearchCriteria {
	projectIds?: string[]
	userIds?: string[]
	dateFrom?: string
	dateTo?: string
}

export interface WorklogEntryRepository {
	search(criteria: WorklogEntrySearchCriteria): Promise<WorklogEntry[]>
	create(entry: WorklogEntry): Promise<WorklogEntry>
	delete(entryId: string): Promise<void>
	deleteByCriteria(criteria: WorklogEntrySearchCriteria): Promise<number>
}
