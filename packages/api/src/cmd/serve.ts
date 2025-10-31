import { Command } from 'commander'

import { app } from '../infrastructure/http/index.ts'

export const serve = new Command('serve').description('Start HTTP server')

serve.action(function serve() {
	const start = process.hrtime.bigint()

	app.listen({
		port: 3000,
		hostname: 'localhost',

		idleTimeout: 30,
		maxRequestBodySize: 1 * 2 ** 20
	})

	if (!app.server) {
		throw new Error('Failed to start HTTP server')
	}

	const duration = Number((process.hrtime.bigint() - start) / BigInt(1e6))

	console.log(`HTTP server started on port ${app.server?.port}`)
	console.log(`HTTP server started in ${duration}ms`)

	// logger.info(
	// 	{
	// 		id: server.id,
	// 		port: server.port,
	// 		host: server.hostname
	// 	},

	// 	'HTTP server started'
	// )

	// async function stopServer(): Promise<void> {
	// 	logger.info('stopping HTTP server')

	// 	return server
	// 		.stop()
	// 		.then(() => {
	// 			logger.info('HTTP server stopped')
	// 		})
	// 		.catch(err => {
	// 			logger.error({ err }, 'failed to stop HTTP server')
	// 		})
	// }

	// function shutdown(): void {
	// 	let uptime = (process.hrtime.bigint() - start) / BigInt(1e6)
	// 	logger.info({ uptime }, 'shutting down')

	// 	stopServer()
	// 		.catch(err => {
	// 			logger.error(err)
	// 		})
	// 		.finally(() => {
	// 			process.exit(1)
	// 		})
	// }

	// function handleShutdownSignal(signal: NodeJS.Signals): void {
	// 	logger.info({ signal }, 'received shutdown signal')
	// 	shutdown()
	// }

	// function handleUnhandledError(err: Error, type: unknown): void {
	// 	let message: string

	// 	switch (true) {
	// 		case type === 'uncaughtException':
	// 			message = 'an uncaught exception was thrown'
	// 			break

	// 		case type instanceof Promise:
	// 			message = 'an unhandled promise rejection occurred'
	// 			break

	// 		default:
	// 			message = 'an unhandled error occurred'
	// 	}

	// 	logger.error(err, message)
	// 	shutdown()
	// }

	// process.on('SIGINT', handleShutdownSignal)
	// process.on('SIGTERM', handleShutdownSignal)

	// process.on('unhandledRejection', handleUnhandledError)
	// process.on('uncaughtException', handleUnhandledError)
})
