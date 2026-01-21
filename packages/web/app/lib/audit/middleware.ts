import { AsyncLocalStorage } from 'node:async_hooks'

import { RequestContext } from '@mikro-orm/core'

import { orm } from '~/lib/mikro-orm/index.ts'

import { AuditLogger } from './logger.ts'
import { auditContextStorage, createAuditContext } from './request-context.ts'

/**
 * AsyncLocalStorage for the AuditLogger instance.
 * Separate from the context storage to allow independent lifecycle management.
 */
const auditLoggerStorage = new AsyncLocalStorage<AuditLogger>()

/**
 * Get the current AuditLogger from AsyncLocalStorage.
 * Returns undefined if not in an audited context.
 */
export function getAuditLogger(): AuditLogger | undefined {
	return auditLoggerStorage.getStore()
}

/**
 * Higher-order function that wraps a route handler with audit context.
 * Combines MikroORM RequestContext with audit logging.
 *
 * @example
 * ```ts
 * export const loader = withAuditContext(async function loader({ request }) {
 *   const auditLogger = getAuditLogger()
 *   // ... handler logic
 * })
 * ```
 */
export function withAuditContext<TArgs extends [{ request: Request }, ...unknown[]], TReturn>(
	fn: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<TReturn> {
	return async (...args: TArgs) => {
		const request = args[0].request
		const context = createAuditContext(request)
		const logger = new AuditLogger(context)

		return auditContextStorage.run(context, async () => {
			return auditLoggerStorage.run(logger, async () => {
				return RequestContext.create(orm.em, async () => {
					try {
						const result = await fn(...args)
						await logger.flush()
						return result
					} catch (error) {
						// Still persist audit trail on errors - wrap in try-catch to not mask original error
						try {
							await logger.flush()
						} catch (flushError) {
							// biome-ignore lint/suspicious/noConsole: Required for debugging audit flush errors
							console.error('[AuditLog] Error during flush in catch block:', flushError)
						}
						throw error
					} finally {
						// Prevent memory leaks
						logger.clear()
					}
				})
			})
		})
	}
}

/**
 * Higher-order function that wraps a route handler with audit context
 * and session ID extraction from the request.
 *
 * Use this variant when you need to include the session ID in audit logs.
 */
export function withAuditContextAndSession<
	TArgs extends [{ request: Request }, ...unknown[]],
	TReturn
>(
	sessionIdExtractor: (request: Request) => Promise<string | undefined>,
	fn: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<TReturn> {
	return async (...args: TArgs) => {
		const request = args[0].request
		const sessionId = await sessionIdExtractor(request)
		const context = createAuditContext(request, sessionId)
		const logger = new AuditLogger(context)

		return auditContextStorage.run(context, async () => {
			return auditLoggerStorage.run(logger, async () => {
				return RequestContext.create(orm.em, async () => {
					try {
						const result = await fn(...args)
						await logger.flush()
						return result
					} catch (error) {
						// Still persist audit trail on errors - wrap in try-catch to not mask original error
						try {
							await logger.flush()
						} catch (flushError) {
							// biome-ignore lint/suspicious/noConsole: Required for debugging audit flush errors
							console.error('[AuditLog] Error during flush in catch block:', flushError)
						}
						throw error
					} finally {
						// Prevent memory leaks
						logger.clear()
					}
				})
			})
		})
	}
}
