import type { IdGenerator } from '../core/services/id-generator.ts'
import type { InMemoryWorklogEntryRepository } from '../infrastructure/worklogs/poc/in-memory-worklog-entry-repository.ts'

import { Command } from 'commander'

import { container, debugContainer, InjectionKey } from '../core/ioc/index.ts'
import { projectsContainerModule } from '../modules/projects/infrastructure/projects-container-module.ts'
import { worklogsContainerModule } from '../modules/worklogs/infrastructure/worklogs-container-module.ts'
import { worklogsPocContainerModule } from '../infrastructure/worklogs/poc/worklogs-poc-container-module.ts'
import { initializeSampleWorklogEntries } from '../infrastructure/worklogs/poc/sample-data.ts'
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

	// Load domain modules
	container.load(projectsContainerModule)
	container.load(worklogsContainerModule)

	// Load infrastructure modules (POC for now)
	container.load(worklogsPocContainerModule)

	// Bind core services
	container.bind<IdGenerator>(InjectionKey.IdGenerator).to(BunUuidV7Generator).inSingletonScope()

	const idGenerator = container.get<IdGenerator>(InjectionKey.IdGenerator)
	const serverId = idGenerator.generate()
	const duration = Number((process.hrtime.bigint() - start) / BigInt(1e6))

	process.stdout.write(`[${serverId}] HTTP server started on port ${/* app.server.port */ 3000}\n`)
	process.stdout.write(`[${serverId}] Container initialized in ${duration}ms\n`)

	// Initialize sample data in development mode
	if (Bun.env.NODE_ENV === 'development') {
		try {
			const repository = container.get<InMemoryWorklogEntryRepository>(
				InjectionKey.WorklogEntryRepository
			)
			const sampleEntries = initializeSampleWorklogEntries(repository, idGenerator)
			process.stdout.write(
				`[${serverId}] Initialized ${sampleEntries.length} sample worklog entries\n`
			)
		} catch (error) {
			process.stderr.write(
				`[${serverId}] Warning: Failed to initialize sample worklog entries: ${error instanceof Error ? error.message : 'Unknown error'}\n`
			)
		}
	}

	// Debug: Pretty-print container bindings
	if (Bun.env.NODE_ENV === 'development' || Bun.env['DEBUG_CONTAINER'] === 'true') {
		debugContainer(container)
	}

	// TODO: Resolve and start HTTP server with resolved dependencies
	// Example:
	// const httpServer = container.get<HttpServer>(InjectionKey.HttpServer)
	// httpServer.start(container)
})
