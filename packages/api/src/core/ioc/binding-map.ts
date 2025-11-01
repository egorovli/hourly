import type { IdGenerator } from '../../core/services/id-generator.ts'
import type { ProjectRepository } from '../../modules/projects/domain/repositories/project-repository.ts'
import type { ResourceRepository } from '../../modules/projects/domain/repositories/resource-repository.ts'
import type { FindProjectUseCase } from '../../modules/projects/domain/use-cases/find-project.use-case.ts'
import type { GetProjectByIdUseCase } from '../../modules/projects/domain/use-cases/get-project-by-id.use-case.ts'
import type { GetResourceByIdUseCase } from '../../modules/projects/domain/use-cases/get-resource-by-id.use-case.ts'
import type { ListProjectsUseCase } from '../../modules/projects/domain/use-cases/list-projects.use-case.ts'
import type { ListResourcesUseCase } from '../../modules/projects/domain/use-cases/list-resources.use-case.ts'
import type { WorklogEntryRepository } from '../../modules/worklogs/domain/repositories/worklog-entry-repository.ts'
import type { WorklogEntryValidator } from '../../modules/worklogs/domain/services/worklog-entry-validator.ts'
import type { ListWorklogEntriesUseCase } from '../../modules/worklogs/domain/use-cases/list-worklog-entries.use-case.ts'
import type { SyncWorklogEntriesUseCase } from '../../modules/worklogs/domain/use-cases/sync-worklog-entries.use-case.ts'
import type { WorklogEntryFactory } from '../../modules/worklogs/infrastructure/worklog-entry-factory.ts'

import { InjectionKey } from './injection-key.enum.ts'

/**
 * BindingMap - Type-safe mapping of InjectionKeys to their implementations
 *
 * This interface defines the contract for all container bindings, providing
 * compile-time type safety for bindings, retrievals, and injections.
 *
 * @see https://inversify.io/docs/ecosystem/strongly-typed/
 */
export interface BindingMap {
	// Core services
	[InjectionKey.IdGenerator]: IdGenerator
	// Projects module - repositories (interfaces, implementations bound in infrastructure)
	[InjectionKey.ProjectRepository]: ProjectRepository
	[InjectionKey.ResourceRepository]: ResourceRepository
	// Projects module - use cases
	[InjectionKey.ListProjectsUseCase]: ListProjectsUseCase
	[InjectionKey.ListResourcesUseCase]: ListResourcesUseCase
	[InjectionKey.GetProjectByIdUseCase]: GetProjectByIdUseCase
	[InjectionKey.GetResourceByIdUseCase]: GetResourceByIdUseCase
	[InjectionKey.FindProjectUseCase]: FindProjectUseCase
	// Worklogs module - repositories (interfaces, implementations bound in infrastructure)
	[InjectionKey.WorklogEntryRepository]: WorklogEntryRepository
	// Worklogs module - domain services
	[InjectionKey.WorklogEntryValidator]: WorklogEntryValidator
	[InjectionKey.WorklogEntryFactory]: WorklogEntryFactory
	// Worklogs module - use cases
	[InjectionKey.ListWorklogEntriesUseCase]: ListWorklogEntriesUseCase
	[InjectionKey.SyncWorklogEntriesUseCase]: SyncWorklogEntriesUseCase
	// Logger is not yet implemented, but included for future use
	// [InjectionKey.Logger]: Logger
}
