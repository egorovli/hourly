import type { Container } from 'inversify'
import type { IdGenerator } from '../../../core/services/id-generator.ts'

import { InjectionKey } from '../../../core/ioc/injection-key.enum.ts'
import { ListWorklogEntriesUseCase } from '../../../modules/worklogs/domain/use-cases/list-worklog-entries.use-case.ts'
import { SyncWorklogEntriesUseCase } from '../../../modules/worklogs/domain/use-cases/sync-worklog-entries.use-case.ts'
import { InMemoryWorklogEntryRepository } from './in-memory-worklog-entry-repository.ts'
import { initializeSampleWorklogEntries } from './sample-data.ts'

/**
 * Example usage of the POC worklogs adapters
 *
 * This demonstrates how to:
 * 1. Set up the container with POC modules
 * 2. Initialize sample data
 * 3. Use the use cases
 */
export async function exampleWorklogsPocUsage(container: Container): Promise<void> {
	// Get the repository (already bound via container)
	const repository = container.get<InMemoryWorklogEntryRepository>(
		InjectionKey.WorklogEntryRepository
	)
	const idGenerator = container.get<IdGenerator>(InjectionKey.IdGenerator)

	// Initialize sample data
	console.log('Initializing sample worklog entries...')
	const sampleEntries = initializeSampleWorklogEntries(repository, idGenerator)
	console.log(`Created ${sampleEntries.length} sample entries`)

	// Example 1: List worklog entries
	const listUseCase = container.get<ListWorklogEntriesUseCase>(
		InjectionKey.ListWorklogEntriesUseCase
	)

	const now = new Date()
	const sevenDaysAgo = new Date(now)
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

	const dateFrom = sevenDaysAgo.toISOString().split('T')[0]!
	const dateTo = now.toISOString().split('T')[0]!

	const listResult = await listUseCase.execute({
		projectIds: ['project-a'],
		userIds: ['user-account-123'],
		dateFrom,
		dateTo,
		page: 1,
		size: 10
	})

	console.log(`Found ${listResult.entries.length} entries`)
	console.log(`Total: ${listResult.pageInfo.total}, Has next page: ${listResult.pageInfo.hasNextPage}`)

	// Example 2: Sync worklog entries
	const syncUseCase = container.get<SyncWorklogEntriesUseCase>(
		InjectionKey.SyncWorklogEntriesUseCase
	)

	const syncResult = await syncUseCase.execute({
		entries: [
			{
				issueKey: 'PROJ-999',
				summary: 'New worklog entry',
				projectId: 'project-a',
				authorAccountId: 'user-account-123',
				started: new Date().toISOString(),
				timeSpentSeconds: 7200 // 2 hours
			}
		],
		dateFrom,
		dateTo,
		authorAccountId: 'user-account-123'
	})

	console.log(
		`Sync completed: ${syncResult.totalSuccess} succeeded, ${syncResult.totalFailed} failed`
	)
	console.log(`Deleted: ${syncResult.deleted.success}, Created: ${syncResult.created.success}`)
}

