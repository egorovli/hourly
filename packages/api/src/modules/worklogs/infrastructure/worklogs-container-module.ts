import type { TypedContainerModule } from '@inversifyjs/strongly-typed'

import { ContainerModule } from 'inversify'

import type { BindingMap } from '../../../core/ioc/binding-map.ts'
import { InjectionKey } from '../../../core/ioc/injection-key.enum.ts'
import { ListWorklogEntriesUseCase } from '../domain/use-cases/list-worklog-entries.use-case.ts'
import { SyncWorklogEntriesUseCase } from '../domain/use-cases/sync-worklog-entries.use-case.ts'
import { DefaultWorklogEntryFactory } from './default-worklog-entry-factory.ts'
import { ZodWorklogEntryValidator } from './zod-worklog-entry-validator.ts'

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
	// Domain services - bind Zod-based implementation
	options.bind(InjectionKey.WorklogEntryValidator).to(ZodWorklogEntryValidator).inSingletonScope()

	// Domain factories - bind factory implementation
	options.bind(InjectionKey.WorklogEntryFactory).to(DefaultWorklogEntryFactory).inSingletonScope()

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
}) as TypedContainerModule<BindingMap>
