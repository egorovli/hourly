import { z } from 'zod'

import { AuditLogActionType } from './audit-log-action-type.enum.ts'
import { AuditLogOutcome } from './audit-log-outcome.enum.ts'
import { AuditLogSeverity } from './audit-log-severity.enum.ts'
import { AuditLogTargetResourceType } from './audit-log-target-resource-type.enum.ts'

export type AuditLogViewMode = 'flat' | 'grouped'

export interface AuditLogEntry {
	id: string

	// Actor (compound foreign key to Profile, nullable for anonymous/failed auth)
	actorProfileId?: string
	actorProvider?: string

	// Action
	actionType: AuditLogActionType
	actionDescription: string
	severity: AuditLogSeverity

	// Target resource
	targetResourceType: AuditLogTargetResourceType
	targetResourceId?: string

	// Result
	outcome: AuditLogOutcome
	occurredAt: string
	metadata?: Record<string, unknown>

	// Event correlation
	correlationId: string
	sessionId?: string
	requestId: string

	// Request context
	requestPath: string
	requestMethod: string
	ipAddress?: string
	userAgent?: string

	// Performance & hierarchy
	durationMs?: number
	parentEventId?: string
	sequenceNumber?: number
}

export interface AuditLogPagination {
	page: number
	pageSize: number
	total: number
	totalPages: number
}

export interface AuditLogListResponse {
	entries: AuditLogEntry[]
	pagination: AuditLogPagination
}

export interface AuditLogGroup {
	correlationId: string
	primaryEvent: AuditLogEntry // First by sequence_number
	eventCount: number
	events: AuditLogEntry[]
	hasFailure: boolean // Any event with outcome=failure
	highestSeverity: AuditLogSeverity
	timeRange: { start: string; end: string }
}

export const auditLogQuerySchema = z.object({
	'page[number]': z.coerce.number().int().min(1).optional().default(1),
	'page[size]': z.coerce.number().int().min(1).max(100).optional().default(20),
	'filter[action-type]': z
		.preprocess(
			value => (Array.isArray(value) ? value : value === undefined ? [] : [value]),
			z.enum(Object.values(AuditLogActionType) as [string, ...string[]]).array()
		)
		.optional()
		.default(() => []),
	'filter[outcome]': z
		.preprocess(
			value => (Array.isArray(value) ? value : value === undefined ? [] : [value]),
			z.enum(Object.values(AuditLogOutcome) as [string, ...string[]]).array()
		)
		.optional()
		.default(() => []),
	'filter[severity]': z
		.preprocess(
			value => (Array.isArray(value) ? value : value === undefined ? [] : [value]),
			z.enum(Object.values(AuditLogSeverity) as [string, ...string[]]).array()
		)
		.optional()
		.default(() => []),
	'filter[target-resource-type]': z
		.preprocess(
			value => (Array.isArray(value) ? value : value === undefined ? [] : [value]),
			z.enum(Object.values(AuditLogTargetResourceType) as [string, ...string[]]).array()
		)
		.optional()
		.default(() => []),
	'filter[actor]': z
		.preprocess(
			value => (Array.isArray(value) ? value : value === undefined ? [] : [value]),
			z
				.string()
				.array() // Format: "provider:profileId"
		)
		.optional()
		.default(() => []),
	'filter[from]': z.iso.datetime().optional(),
	'filter[to]': z.iso.datetime().optional(),
	'view[mode]': z.enum(['flat', 'grouped']).optional().default('flat')
})

export type AuditLogQueryParams = z.infer<typeof auditLogQuerySchema>

export interface ResolvedActor {
	profileId: string
	provider: string
	displayName?: string
	email?: string
	avatarUrl?: string
}

export interface AuditLogLoaderResponse {
	entries?: AuditLogEntry[]
	groups?: AuditLogGroup[]
	pagination: AuditLogPagination
	params: AuditLogQueryParams
	actors: Record<string, ResolvedActor>
	allActors: Record<string, ResolvedActor> // All actors in the system for filter dropdown
	viewMode: AuditLogViewMode
}
