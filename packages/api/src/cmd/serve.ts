import { Command } from 'commander'

export const serve = new Command('serve').description('Start HTTP server')

serve.action(function serve() {
	const start = process.hrtime.bigint()
	const duration = Number((process.hrtime.bigint() - start) / BigInt(1e6))

	process.stdout.write(`HTTP server started on port ${/* app.server.port */ 3000}\n`)
	process.stdout.write(`HTTP server started in ${duration}ms\n`)
})
