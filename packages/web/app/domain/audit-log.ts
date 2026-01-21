import { z } from 'zod'

import { AuditLogActionType } from './audit-log-action-type.enum.ts'
import { AuditLogOutcome } from './audit-log-outcome.enum.ts'
import { AuditLogTargetResourceType } from './audit-log-target-resource-type.enum.ts'

export interface AuditLogEntry {
	id: string

	// Actor (compound foreign key to Profile)
	actorProfileId: string
	actorProvider: string

	// Action
	actionType: AuditLogActionType
	actionDescription: string

	// Target resource
	targetResourceType: AuditLogTargetResourceType
	targetResourceId?: string

	// Result
	outcome: AuditLogOutcome
	occurredAt: string
	metadata?: Record<string, unknown>
}

export interface AuditLogListResponse {
	entries: AuditLogEntry[]
	pagination: {
		page: number
		pageSize: number
		total: number
		totalPages: number
	}
}

export const auditLogQuerySchema = z.object({
	'page[number]': z.coerce.number().int().min(1).optional().default(1),
	'page[size]': z.coerce.number().int().min(1).max(100).optional().default(20),
	'filter[action-type]': z
		.preprocess(
			value => (Array.isArray(value) ? value : value === undefined ? [] : [value]),
			z.enum(AuditLogActionType).array()
		)
		.optional()
		.default(() => []),
	'filter[outcome]': z
		.preprocess(
			value => (Array.isArray(value) ? value : value === undefined ? [] : [value]),
			z.enum(AuditLogOutcome).array()
		)
		.optional()
		.default(() => []),
	'filter[target-resource-type]': z
		.preprocess(
			value => (Array.isArray(value) ? value : value === undefined ? [] : [value]),
			z.enum(AuditLogTargetResourceType).array()
		)
		.optional()
		.default(() => []),
	'filter[from]': z.iso.datetime().optional(),
	'filter[to]': z.iso.datetime().optional()
})

export type AuditLogQueryParams = z.infer<typeof auditLogQuerySchema>

export interface ResolvedActor {
	profileId: string
	provider: string
	displayName?: string
	avatarUrl?: string
}

export interface AuditLogLoaderResponse extends AuditLogListResponse {
	params: AuditLogQueryParams
	actors: Record<string, ResolvedActor>
}
