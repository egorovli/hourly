import type { TypedContainerModule } from '@inversifyjs/strongly-typed'

import { ContainerModule } from 'inversify'

import type { BindingMap } from '../../../core/ioc/binding-map.ts'
import { InjectionKey } from '../../../core/ioc/injection-key.enum.ts'
import { FindProjectUseCase } from '../domain/use-cases/find-project.use-case.ts'
import { GetProjectByIdUseCase } from '../domain/use-cases/get-project-by-id.use-case.ts'
import { GetResourceByIdUseCase } from '../domain/use-cases/get-resource-by-id.use-case.ts'
import { ListProjectsUseCase } from '../domain/use-cases/list-projects.use-case.ts'
import { ListResourcesUseCase } from '../domain/use-cases/list-resources.use-case.ts'

/**
 * ProjectsContainerModule - Container module for projects domain
 *
 * Binds use cases and repository interfaces for the projects module.
 * Repository implementations should be bound in infrastructure modules.
 *
 * Note: Repository implementations are not bound here as they belong in
 * infrastructure layer. This module only binds domain abstractions and use cases.
 */
export const projectsContainerModule = new ContainerModule(options => {
	// Use cases - these will be resolved when repositories are bound
	options
		.bind<ListProjectsUseCase>(InjectionKey.ListProjectsUseCase)
		.to(ListProjectsUseCase)
		.inSingletonScope()

	options
		.bind<ListResourcesUseCase>(InjectionKey.ListResourcesUseCase)
		.to(ListResourcesUseCase)
		.inSingletonScope()

	options
		.bind<GetProjectByIdUseCase>(InjectionKey.GetProjectByIdUseCase)
		.to(GetProjectByIdUseCase)
		.inSingletonScope()

	options
		.bind<GetResourceByIdUseCase>(InjectionKey.GetResourceByIdUseCase)
		.to(GetResourceByIdUseCase)
		.inSingletonScope()

	options
		.bind<FindProjectUseCase>(InjectionKey.FindProjectUseCase)
		.to(FindProjectUseCase)
		.inSingletonScope()

	// Repository interfaces - implementations must be bound separately in infrastructure
	// Example: bind<ProjectRepository>(InjectionKey.ProjectRepository).to(SomeProjectRepositoryImpl).inSingletonScope()
	// This is done in infrastructure modules, not here
}) as TypedContainerModule<BindingMap>
