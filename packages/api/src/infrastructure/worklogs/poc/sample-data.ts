import type { IdGenerator } from '../../../core/services/id-generator.ts'

import { WorklogEntry } from '../../../modules/worklogs/domain/entities/worklog-entry.ts'

import { InMemoryWorklogEntryRepository } from './in-memory-worklog-entry-repository.ts'

/**
 * Initialize sample worklog entries for POC demonstration
 */
export function initializeSampleWorklogEntries(
	repository: InMemoryWorklogEntryRepository,
	idGenerator: IdGenerator
): WorklogEntry[] {
	const now = new Date()
	const entries: WorklogEntry[] = []

	// Create sample entries for the last 7 days
	for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
		const date = new Date(now)
		date.setDate(date.getDate() - dayOffset)
		date.setHours(9, 0, 0, 0) // 9 AM

		// Create 2-3 entries per day
		const entriesPerDay = 2 + Math.floor(Math.random() * 2)

		for (let i = 0; i < entriesPerDay; i++) {
			const entryTime = new Date(date)
			entryTime.setHours(9 + i * 3, Math.floor(Math.random() * 60), 0, 0)

			const timeSpentSeconds = (2 + Math.floor(Math.random() * 4)) * 3600 // 2-6 hours

			const entry = new WorklogEntry({
				id: idGenerator.generate(),
				issueKey: `PROJ-${100 + dayOffset * 10 + i}`,
				issueId: `issue-${100 + dayOffset * 10 + i}`,
				summary: `Worked on feature ${100 + dayOffset * 10 + i}`,
				projectId: `project-${dayOffset % 2 === 0 ? 'a' : 'b'}`,
				authorAccountId: 'user-account-123',
				started: entryTime.toISOString(),
				timeSpentSeconds
			})

			entries.push(entry)
			repository.create(entry).catch(() => {
				// Ignore errors during initialization
			})
		}
	}

	return entries
}

