import { Entity, Enum, Index, PrimaryKey, PrimaryKeyProp, Property } from '@mikro-orm/core'
import { ulid } from 'ulid'

import { AuditLogActionType } from '~/domain/audit-log-action-type.enum.ts'
import { AuditLogOutcome } from '~/domain/audit-log-outcome.enum.ts'
import { AuditLogSeverity } from '~/domain/audit-log-severity.enum.ts'
import { AuditLogTargetResourceType } from '~/domain/audit-log-target-resource-type.enum.ts'

@Entity({ tableName: 'audit_logs' })
@Index({ properties: ['actorProfileId', 'actorProvider', 'occurredAt'] })
@Index({ properties: ['correlationId', 'occurredAt'] })
export class AuditLog {
	// Composite PK for partitioning - NOT extending BaseEntity
	@PrimaryKey()
	id: string = ulid()

	@PrimaryKey({ name: 'occurred_at', columnType: 'timestamptz' })
	occurredAt: Date = new Date();

	[PrimaryKeyProp]?: ['id', 'occurredAt']

	// Actor (nullable for anonymous/failed auth)
	@Property({ name: 'actor_profile_id', nullable: true })
	actorProfileId?: string

	@Property({ name: 'actor_provider', nullable: true })
	actorProvider?: string

	// Action
	@Enum({ items: () => AuditLogActionType, nativeEnumName: 'audit_log_action_type' })
	actionType!: AuditLogActionType

	@Property({ name: 'action_description', columnType: 'text' })
	actionDescription!: string

	@Enum({ items: () => AuditLogSeverity, nativeEnumName: 'audit_log_severity' })
	severity: AuditLogSeverity = AuditLogSeverity.Info

	// Target
	@Enum({
		items: () => AuditLogTargetResourceType,
		nativeEnumName: 'audit_log_target_resource_type'
	})
	targetResourceType!: AuditLogTargetResourceType

	@Property({ name: 'target_resource_id', nullable: true })
	targetResourceId?: string

	// Result
	@Enum({ items: () => AuditLogOutcome, nativeEnumName: 'audit_log_outcome' })
	outcome!: AuditLogOutcome

	// Correlation
	@Property({ name: 'correlation_id' })
	correlationId!: string

	@Property({ name: 'session_id', nullable: true })
	sessionId?: string

	@Property({ name: 'request_id' })
	requestId!: string

	// Request context
	@Property({ name: 'request_path', columnType: 'text' })
	requestPath!: string

	@Property({ name: 'request_method' })
	requestMethod!: string

	@Property({ name: 'ip_address', nullable: true })
	ipAddress?: string

	@Property({ name: 'user_agent', nullable: true, columnType: 'text' })
	userAgent?: string

	// Performance & hierarchy
	@Property({ name: 'duration_ms', nullable: true })
	durationMs?: number

	@Property({ name: 'parent_event_id', nullable: true })
	parentEventId?: string

	@Property({ name: 'sequence_number', nullable: true })
	sequenceNumber?: number

	// Metadata
	@Property({ type: 'json', nullable: true })
	metadata?: Record<string, unknown>

	// Append-only: created_at only
	@Property({ name: 'created_at', columnType: 'timestamptz' })
	createdAt: Date = new Date()
}
