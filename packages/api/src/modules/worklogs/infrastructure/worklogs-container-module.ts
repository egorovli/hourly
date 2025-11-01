import { ContainerModule } from 'inversify'

import { InjectionKey } from '../../../core/ioc/injection-key.enum.ts'
import { ListWorklogEntriesUseCase } from '../domain/use-cases/list-worklog-entries.use-case.ts'
import { SyncWorklogEntriesUseCase } from '../domain/use-cases/sync-worklog-entries.use-case.ts'

/**
 * WorklogsContainerModule - Container module for worklogs domain
 *
 * Binds use cases and repository interfaces for the worklogs module.
 * Repository implementations should be bound in infrastructure modules.
 *
 * Note: Repository implementations are not bound here as they belong in
 * infrastructure layer. This module only binds domain abstractions and use cases.
 */
export const worklogsContainerModule = new ContainerModule(options => {
	// Use cases - these will be resolved when repositories are bound
	options
		.bind<ListWorklogEntriesUseCase>(InjectionKey.ListWorklogEntriesUseCase)
		.to(ListWorklogEntriesUseCase)
		.inSingletonScope()

	options
		.bind<SyncWorklogEntriesUseCase>(InjectionKey.SyncWorklogEntriesUseCase)
		.to(SyncWorklogEntriesUseCase)
		.inSingletonScope()

	// Repository interfaces - implementations must be bound separately in infrastructure
	// Example: bind<WorklogEntryRepository>(InjectionKey.WorklogEntryRepository).to(SomeWorklogEntryRepositoryImpl).inSingletonScope()
	// This is done in infrastructure modules, not here
})
