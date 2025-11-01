import type { WorklogEntryRepository } from '../../../modules/worklogs/domain/repositories/worklog-entry-repository.ts'
import type { WorklogEntryFactory } from '../../../modules/worklogs/domain/services/worklog-entry-factory.ts'

import { DefaultWorklogEntryFactory } from '../../../modules/worklogs/infrastructure/default-worklog-entry-factory.ts'
import { ZodWorklogEntryValidator } from '../../../modules/worklogs/infrastructure/zod-worklog-entry-validator.ts'
import { BunUuidV7Generator } from '../../../infrastructure/ids/bun-uuid-v7-generator.ts'

/**
 * Initialize sample worklog entries for POC demonstration
 */
export function initializeSampleWorklogEntries(
	repository: WorklogEntryRepository,
	factory: WorklogEntryFactory = new DefaultWorklogEntryFactory(
		new BunUuidV7Generator(),
		new ZodWorklogEntryValidator()
	)
): ReturnType<WorklogEntryFactory['create']>[] {
	const now = new Date()
	const entries: ReturnType<WorklogEntryFactory['create']>[] = []

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

			const entry = factory.create({
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
