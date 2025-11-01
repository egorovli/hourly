import { Container } from 'inversify'

export const container = new Container()

// /**
//  * CoreContainerModule - Core application services
//  *
//  * Binds cross-cutting concerns and infrastructure services that are used
//  * throughout the application (e.g., ID generation, logging).
//  */
// export const coreContainerModule = new ContainerModule(options => {
// 	options.bind<IdGenerator>(InjectionKey.IdGenerator).to(BunUuidV7Generator).inSingletonScope()
// })

// /**
//  * Default container modules for the application
//  *
//  * These modules are loaded by default when creating a container.
//  * Add module-specific container modules here to include them automatically.
//  */
// export const defaultContainerModules: ContainerModule[] = [coreContainerModule]

// export interface CreateContainerOptions {
// 	/**
// 	 * Additional container modules to load
// 	 */
// 	modules?: ContainerModule[]
// 	/**
// 	 * Whether to include default modules (core, etc.)
// 	 * @default true
// 	 */
// 	includeDefaults?: boolean
// }

// /**
//  * Creates a configured Inversify container
//  *
//  * This is the composition root for dependency injection. All dependencies
//  * should be resolved here and passed down to application components.
//  *
//  * @param options - Configuration options for container creation
//  * @returns Configured Inversify container
//  *
//  * @example
//  * ```typescript
//  * const container = createContainer({
//  *   modules: [projectsContainerModule],
//  *   includeDefaults: true
//  * })
//  * ```
//  */
// export function createContainer(options: CreateContainerOptions = {}): Container {
// 	const container = new Container()
// 	const extraModules = options.modules ?? []
// 	const modulesToLoad =
// 		options.includeDefaults === false ? extraModules : [...defaultContainerModules, ...extraModules]
// 	container.load(...modulesToLoad)
// 	return container
// }
