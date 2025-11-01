import { ContainerModule } from 'inversify'

import { InjectionKey } from '../../../core/ioc/injection-key.enum.ts'
import { InMemoryWorklogEntryRepository } from './in-memory-worklog-entry-repository.ts'

/**
 * WorklogsPocContainerModule - POC infrastructure module for worklogs
 *
 * Binds the in-memory repository implementation for proof-of-concept testing.
 * This module should be replaced with a real implementation (e.g., database-backed)
 * in production.
 */
export const worklogsPocContainerModule = new ContainerModule(options => {
	options
		.bind(InjectionKey.WorklogEntryRepository)
		.to(InMemoryWorklogEntryRepository)
		.inSingletonScope()
})

