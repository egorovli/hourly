import { program } from './cmd/index.ts'
// import { logger } from './logger/index.js'

// process.on('warning', err => {
// 	logger.warn({ err }, 'system warning')
// })

program.parse(process.argv)

// export type { App } from './hono/index.js'
// export * as domain from './domain/index.js'
