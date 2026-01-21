import { AsyncLocalStorage } from 'node:async_hooks'

import { ulid } from 'ulid'

/**
 * Audit request context stored in AsyncLocalStorage.
 * Contains correlation IDs and request metadata for audit logging.
 */
export interface AuditRequestContext {
	/** ULID that groups related events in the same user flow */
	correlationId: string
	/** ULID unique to this HTTP request */
	requestId: string
	/** Browser session ID (from cookie) */
	sessionId?: string
	/** Request path (e.g., "/api/worklog.entries") */
	requestPath: string
	/** HTTP method (GET, POST, etc.) */
	requestMethod: string
	/** Client IP address */
	ipAddress?: string
	/** User agent string (truncated) */
	userAgent?: string
	/** Request start timestamp for duration calculation */
	startTime: number
}

/**
 * AsyncLocalStorage for request-scoped audit context.
 */
export const auditContextStorage = new AsyncLocalStorage<AuditRequestContext>()

/**
 * Extract client IP from request, handling common proxy headers.
 */
export function extractClientIp(request: Request): string | undefined {
	const headers = request.headers

	// Check common proxy headers in order of preference
	const forwardedFor = headers.get('x-forwarded-for')
	if (forwardedFor) {
		// X-Forwarded-For can contain multiple IPs; take the first (client IP)
		return forwardedFor.split(',')[0]?.trim()
	}

	const realIp = headers.get('x-real-ip')
	if (realIp) {
		return realIp.trim()
	}

	const cfConnectingIp = headers.get('cf-connecting-ip')
	if (cfConnectingIp) {
		return cfConnectingIp.trim()
	}

	return undefined
}

/**
 * Create an audit context from a request.
 * Generates ULIDs for correlation and request IDs.
 */
export function createAuditContext(request: Request, sessionId?: string): AuditRequestContext {
	const url = new URL(request.url)

	return {
		correlationId: ulid(),
		requestId: ulid(),
		sessionId,
		requestPath: url.pathname,
		requestMethod: request.method,
		ipAddress: extractClientIp(request),
		userAgent: request.headers.get('user-agent') ?? undefined,
		startTime: Date.now()
	}
}

/**
 * Get the current audit context from AsyncLocalStorage.
 * Returns undefined if not in an audited context.
 */
export function getAuditContext(): AuditRequestContext | undefined {
	return auditContextStorage.getStore()
}
