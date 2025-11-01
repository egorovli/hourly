import type { IdGenerator } from '../core/services/id-generator.ts'

import { Command } from 'commander'

import { container, InjectionKey } from '../core/ioc/index.ts'
import { projectsContainerModule } from '../modules/projects/infrastructure/projects-container-module.ts'
import { BunUuidV7Generator } from '../infrastructure/ids/bun-uuid-v7-generator.ts'

/**
 * Composition Root - Entry point for dependency resolution
 *
 * This is where all dependencies are resolved once and passed down to
 * application components. Avoid using container.get() elsewhere in the codebase.
 */
export const serve = new Command('serve').description('Start HTTP server')

serve.action(function serve() {
	const start = process.hrtime.bigint()

	container.load(projectsContainerModule)
	container.bind<IdGenerator>(InjectionKey.IdGenerator).to(BunUuidV7Generator).inSingletonScope()

	const idGenerator = container.get<IdGenerator>(InjectionKey.IdGenerator)
	const serverId = idGenerator.generate()
	const duration = Number((process.hrtime.bigint() - start) / BigInt(1e6))

	process.stdout.write(`[${serverId}] HTTP server started on port ${/* app.server.port */ 3000}\n`)
	process.stdout.write(`[${serverId}] Container initialized in ${duration}ms\n`)

	// TODO: Resolve and start HTTP server with resolved dependencies
	// Example:
	// const httpServer = container.get<HttpServer>(InjectionKey.HttpServer)
	// httpServer.start(container)
})
