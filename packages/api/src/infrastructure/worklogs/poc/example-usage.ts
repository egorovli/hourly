import type { TypedContainer } from '@inversifyjs/strongly-typed'

import type { BindingMap } from '../../../core/ioc/binding-map.ts'
import { InjectionKey } from '../../../core/ioc/injection-key.enum.ts'
import { initializeSampleWorklogEntries } from './sample-data.ts'

/**
 * Example usage of the POC worklogs adapters
 *
 * This demonstrates how to:
 * 1. Set up the container with POC modules
 * 2. Initialize sample data
 * 3. Use the use cases
 */
export async function exampleWorklogsPocUsage(
	container: TypedContainer<BindingMap>
): Promise<void> {
	// Get the repository (already bound via container) - type is automatically inferred
	const repository = container.get(InjectionKey.WorklogEntryRepository)
	const factory = container.get(InjectionKey.WorklogEntryFactory)

	// Initialize sample data
	console.log('Initializing sample worklog entries...')
	const sampleEntries = initializeSampleWorklogEntries(repository, factory)
	console.log(`Created ${sampleEntries.length} sample entries`)

	// Example 1: List worklog entries - type is automatically inferred
	const listUseCase = container.get(InjectionKey.ListWorklogEntriesUseCase)

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
	console.log(
		`Total: ${listResult.pageInfo.total}, Has next page: ${listResult.pageInfo.hasNextPage}`
	)

	// Example 2: Sync worklog entries - type is automatically inferred
	const syncUseCase = container.get(InjectionKey.SyncWorklogEntriesUseCase)

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
