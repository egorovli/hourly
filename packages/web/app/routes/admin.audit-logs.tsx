import type { Route } from './+types/admin.audit-logs.ts'
import type {
	ActivityAuditLogGroup,
	AuditLogEntry,
	AuditLogGroup,
	AuditLogLoaderResponse,
	AuditLogViewMode,
	ResolvedActor
} from '~/domain/index.ts'
import type { FilterQuery } from '@mikro-orm/core'
import type { AbstractSqlConnection } from '@mikro-orm/postgresql'

import { FileTextIcon } from 'lucide-react'

import { AuditLogActivityTable } from '~/components/admin/audit-log-activity-table.tsx'
import { AuditLogFilters } from '~/components/admin/audit-log-filters.tsx'
import { AuditLogGroupedTable } from '~/components/admin/audit-log-grouped-table.tsx'
import { AuditLogTable } from '~/components/admin/audit-log-table.tsx'
import {
	type AuditLogActionType,
	AuditLogOutcome,
	AuditLogSeverity,
	type AuditLogTargetResourceType,
	auditLogQuerySchema
} from '~/domain/index.ts'
import { auditActions, getAuditLogger, withAuditContext } from '~/lib/audit/index.ts'
import { requireAdmin } from '~/lib/auth/index.ts'
import { cached } from '~/lib/cached/index.ts'
import { AuditLog, orm } from '~/lib/mikro-orm/index.ts'

/**
 * Convert AuditLog entity to AuditLogEntry interface for the frontend.
 */
function toAuditLogEntry(entity: AuditLog): AuditLogEntry {
	return {
		id: entity.id,
		actorProfileId: entity.actorProfileId,
		actorProvider: entity.actorProvider,
		actionType: entity.actionType,
		actionDescription: entity.actionDescription,
		severity: entity.severity,
		targetResourceType: entity.targetResourceType,
		targetResourceId: entity.targetResourceId,
		outcome: entity.outcome,
		occurredAt: entity.occurredAt.toISOString(),
		metadata: entity.metadata,
		correlationId: entity.correlationId,
		sessionId: entity.sessionId,
		requestId: entity.requestId,
		requestPath: entity.requestPath,
		requestMethod: entity.requestMethod,
		ipAddress: entity.ipAddress,
		userAgent: entity.userAgent,
		durationMs: entity.durationMs,
		parentEventId: entity.parentEventId,
		sequenceNumber: entity.sequenceNumber
	}
}

/** Raw row from Knex query with snake_case column names */
interface AuditLogRawRow {
	id: string
	occurred_at: Date | string
	actor_profile_id?: string
	actor_provider?: string
	action_type: string
	action_description: string
	severity: string
	target_resource_type: string
	target_resource_id?: string
	outcome: string
	correlation_id: string
	session_id?: string
	request_id: string
	request_path: string
	request_method: string
	ip_address?: string
	user_agent?: string
	duration_ms?: number
	parent_event_id?: string
	sequence_number?: number
	metadata?: Record<string, unknown>
}

/**
 * Convert a date value from Knex to ISO string.
 * Handles Date objects and various string formats from PostgreSQL.
 */
function toISOString(value: Date | string): string {
	if (value instanceof Date) {
		return value.toISOString()
	}
	// If it's already a valid ISO string, return as-is
	// Otherwise, try to parse it as a Date
	const date = new Date(value)
	if (!Number.isNaN(date.getTime())) {
		return date.toISOString()
	}
	// Fallback: return the string and let the frontend handle it
	return value
}

/**
 * Convert raw Knex row (snake_case) to AuditLogEntry interface.
 */
function rawRowToAuditLogEntry(row: AuditLogRawRow): AuditLogEntry {
	return {
		id: row.id,
		actorProfileId: row.actor_profile_id,
		actorProvider: row.actor_provider,
		actionType: row.action_type as AuditLogActionType,
		actionDescription: row.action_description,
		severity: row.severity as AuditLogSeverity,
		targetResourceType: row.target_resource_type as AuditLogTargetResourceType,
		targetResourceId: row.target_resource_id,
		outcome: row.outcome as AuditLogOutcome,
		occurredAt: toISOString(row.occurred_at),
		metadata: row.metadata,
		correlationId: row.correlation_id,
		sessionId: row.session_id,
		requestId: row.request_id,
		requestPath: row.request_path,
		requestMethod: row.request_method,
		ipAddress: row.ip_address,
		userAgent: row.user_agent,
		durationMs: row.duration_ms,
		parentEventId: row.parent_event_id,
		sequenceNumber: row.sequence_number
	}
}

/**
 * Severity ordering: higher values = more severe
 */
const severityOrder: Record<AuditLogSeverity, number> = {
	[AuditLogSeverity.Debug]: 0,
	[AuditLogSeverity.Info]: 1,
	[AuditLogSeverity.Warning]: 2,
	[AuditLogSeverity.Error]: 3,
	[AuditLogSeverity.Critical]: 4
}

/**
 * Build AuditLogGroup objects from a list of entries grouped by correlationId.
 */
function buildAuditLogGroups(entries: AuditLogEntry[]): AuditLogGroup[] {
	const groupMap = new Map<string, AuditLogEntry[]>()

	for (const entry of entries) {
		const existing = groupMap.get(entry.correlationId) ?? []
		existing.push(entry)
		groupMap.set(entry.correlationId, existing)
	}

	const groups: AuditLogGroup[] = []

	for (const [correlationId, events] of groupMap) {
		// Sort by sequence number, then by occurredAt
		events.sort((a, b) => {
			const seqA = a.sequenceNumber ?? 0
			const seqB = b.sequenceNumber ?? 0
			if (seqA !== seqB) {
				return seqA - seqB
			}
			return new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
		})

		const primaryEvent = events[0]
		if (!primaryEvent) {
			continue
		}

		const hasFailure = events.some(e => e.outcome === AuditLogOutcome.Failure)

		let highestSeverity = primaryEvent.severity
		for (const event of events) {
			if (severityOrder[event.severity] > severityOrder[highestSeverity]) {
				highestSeverity = event.severity
			}
		}

		const timestamps = events.map(e => e.occurredAt)
		const sortedTimestamps = [...timestamps].sort()
		const start = sortedTimestamps[0] ?? primaryEvent.occurredAt
		const end = sortedTimestamps[sortedTimestamps.length - 1] ?? primaryEvent.occurredAt

		groups.push({
			correlationId,
			primaryEvent,
			eventCount: events.length,
			events,
			hasFailure,
			highestSeverity,
			timeRange: { start, end }
		})
	}

	return groups
}

/**
 * Build activity-based groups from entries.
 * Groups events by actor + time proximity or shared correlation ID.
 */
function buildActivityGroups(
	entries: AuditLogEntry[],
	thresholdMs: number
): ActivityAuditLogGroup[] {
	// Group entries by actor key
	const byActor = new Map<string, AuditLogEntry[]>()

	for (const entry of entries) {
		const actorKey =
			entry.actorProfileId && entry.actorProvider
				? `${entry.actorProvider}:${entry.actorProfileId}`
				: 'anonymous'
		const existing = byActor.get(actorKey) ?? []
		existing.push(entry)
		byActor.set(actorKey, existing)
	}

	const groups: ActivityAuditLogGroup[] = []

	for (const [actorKey, actorEntries] of byActor) {
		// Sort by time for gap detection
		actorEntries.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())

		let currentGroup: AuditLogEntry[] = []
		let activeCorrelationIds = new Set<string>()
		let lastEventTime: Date | undefined

		for (const entry of actorEntries) {
			const eventTime = new Date(entry.occurredAt)
			const gap = lastEventTime
				? eventTime.getTime() - lastEventTime.getTime()
				: Number.POSITIVE_INFINITY

			const sharesCorrelation = activeCorrelationIds.has(entry.correlationId)
			const withinThreshold = gap <= thresholdMs

			if (currentGroup.length === 0 || sharesCorrelation || withinThreshold) {
				// Merge into current group
				currentGroup.push(entry)
				activeCorrelationIds.add(entry.correlationId)
				lastEventTime = eventTime
			} else {
				// Finalize current group and start new one
				groups.push(finalizeActivityGroup(actorKey, currentGroup))
				currentGroup = [entry]
				activeCorrelationIds = new Set([entry.correlationId])
				lastEventTime = eventTime
			}
		}

		// Finalize the last group
		if (currentGroup.length > 0) {
			groups.push(finalizeActivityGroup(actorKey, currentGroup))
		}
	}

	// Sort groups by primary event time (newest first)
	groups.sort(
		(a, b) =>
			new Date(b.primaryEvent.occurredAt).getTime() - new Date(a.primaryEvent.occurredAt).getTime()
	)

	return groups
}

/**
 * Create an ActivityAuditLogGroup from a list of grouped entries.
 */
function finalizeActivityGroup(actorKey: string, events: AuditLogEntry[]): ActivityAuditLogGroup {
	// Sort events by sequence number, then by occurredAt
	events.sort((a, b) => {
		const seqA = a.sequenceNumber ?? 0
		const seqB = b.sequenceNumber ?? 0
		if (seqA !== seqB) {
			return seqA - seqB
		}
		return new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
	})

	const primaryEvent = events[0]
	if (!primaryEvent) {
		throw new Error('finalizeActivityGroup called with empty events array')
	}
	const correlationIds = [...new Set(events.map(e => e.correlationId))]
	const hasFailure = events.some(e => e.outcome === AuditLogOutcome.Failure)

	let highestSeverity = primaryEvent.severity
	for (const event of events) {
		if (severityOrder[event.severity] > severityOrder[highestSeverity]) {
			highestSeverity = event.severity
		}
	}

	const timestamps = events.map(e => e.occurredAt)
	const sortedTimestamps = [...timestamps].sort()
	const start = sortedTimestamps[0] ?? primaryEvent.occurredAt
	const end = sortedTimestamps[sortedTimestamps.length - 1] ?? primaryEvent.occurredAt

	// Parse actor from actorKey
	const [actorProvider, ...profileParts] = actorKey.split(':')
	const actorProfileId = profileParts.join(':') || undefined
	const isAnonymous = actorKey === 'anonymous'

	return {
		groupKey: `${actorKey}:${primaryEvent.occurredAt}`,
		actorProfileId: isAnonymous ? undefined : actorProfileId,
		actorProvider: isAnonymous ? undefined : actorProvider,
		correlationIds,
		primaryEvent,
		eventCount: events.length,
		events,
		hasFailure,
		highestSeverity,
		timeRange: { start, end }
	}
}

export const loader = withAuditContext(async function loader({
	request
}: Route.LoaderArgs): Promise<AuditLogLoaderResponse> {
	const auth = await requireAdmin(request)
	const auditLogger = getAuditLogger()

	const url = new URL(request.url)

	// Parse array params using getAll
	const rawParams = {
		'filter[action-type]': url.searchParams.getAll('filter[action-type]'),
		'filter[outcome]': url.searchParams.getAll('filter[outcome]'),
		'filter[severity]': url.searchParams.getAll('filter[severity]'),
		'filter[target-resource-type]': url.searchParams.getAll('filter[target-resource-type]'),
		'filter[actor]': url.searchParams.getAll('filter[actor]'),
		'filter[from]': url.searchParams.get('filter[from]') ?? undefined,
		'filter[to]': url.searchParams.get('filter[to]') ?? undefined,
		'page[number]': url.searchParams.get('page[number]') ?? undefined,
		'page[size]': url.searchParams.get('page[size]') ?? undefined,
		'view[mode]': url.searchParams.get('view[mode]') ?? undefined,
		'view[threshold]': url.searchParams.get('view[threshold]') ?? undefined
	}

	const params = await auditLogQuerySchema.parseAsync(rawParams)

	// Build query filters
	const em = orm.em.fork()
	const where: FilterQuery<AuditLog> = {}

	if (params['filter[action-type]'].length > 0) {
		where.actionType = { $in: params['filter[action-type]'] as AuditLogActionType[] }
	}

	if (params['filter[outcome]'].length > 0) {
		where.outcome = { $in: params['filter[outcome]'] as AuditLogOutcome[] }
	}

	if (params['filter[severity]'].length > 0) {
		where.severity = { $in: params['filter[severity]'] as AuditLogSeverity[] }
	}

	if (params['filter[target-resource-type]'].length > 0) {
		where.targetResourceType = {
			$in: params['filter[target-resource-type]'] as AuditLogTargetResourceType[]
		}
	}

	if (params['filter[from]'] || params['filter[to]']) {
		const occurredAtFilter: { $gte?: Date; $lte?: Date } = {}

		if (params['filter[from]']) {
			occurredAtFilter.$gte = new Date(params['filter[from]'])
		}

		if (params['filter[to]']) {
			// Filter sends end-of-day UTC, so just parse it directly
			occurredAtFilter.$lte = new Date(params['filter[to]'])
		}

		where.occurredAt = occurredAtFilter
	}

	if (params['filter[actor]'].length > 0) {
		const actorFilters = params['filter[actor]']
		const hasAnonymous = actorFilters.includes('anonymous')
		const namedActors = actorFilters.filter(a => a !== 'anonymous')

		const orConditions: FilterQuery<AuditLog>[] = []

		// Add anonymous filter (null actor)
		if (hasAnonymous) {
			orConditions.push({ actorProfileId: null })
		}

		// Add named actor filters
		for (const actor of namedActors) {
			const [provider, ...rest] = actor.split(':')
			const profileId = rest.join(':') // Handle profileIds with colons
			orConditions.push({ actorProvider: provider, actorProfileId: profileId })
		}

		if (orConditions.length > 0) {
			where.$or = orConditions
		}
	}

	// Fetch audit logs with pagination
	const page = params['page[number]']
	const pageSize = params['page[size]']
	const viewMode: AuditLogViewMode = params['view[mode]']
	const threshold = params['view[threshold]']

	let entries: AuditLogEntry[] = []
	let groups: AuditLogGroup[] | undefined
	let activityGroups: ActivityAuditLogGroup[] | undefined
	let hasMore = false

	if (viewMode === 'activity') {
		// Activity mode: group by actor + time proximity or shared correlation
		// For v1, fetch filtered events with limit and group in-memory
		const connection = em.getConnection() as AbstractSqlConnection
		const knex = connection.getKnex()

		// Build Knex query builder with filters (reuse pattern from grouped mode)
		const buildFilteredQuery = () => {
			const qb = knex('audit_logs')

			if (params['filter[action-type]'].length > 0) {
				qb.whereIn('action_type', params['filter[action-type]'])
			}
			if (params['filter[outcome]'].length > 0) {
				qb.whereIn('outcome', params['filter[outcome]'])
			}
			if (params['filter[severity]'].length > 0) {
				qb.whereIn('severity', params['filter[severity]'])
			}
			if (params['filter[target-resource-type]'].length > 0) {
				qb.whereIn('target_resource_type', params['filter[target-resource-type]'])
			}
			if (params['filter[from]']) {
				qb.where('occurred_at', '>=', new Date(params['filter[from]']))
			}
			if (params['filter[to]']) {
				qb.where('occurred_at', '<=', new Date(params['filter[to]']))
			}
			if (params['filter[actor]'].length > 0) {
				const actorFilters = params['filter[actor]']
				const hasAnonymous = actorFilters.includes('anonymous')
				const namedActors = actorFilters.filter(a => a !== 'anonymous')

				qb.where(function () {
					// Add anonymous filter (null actor)
					if (hasAnonymous) {
						this.orWhereNull('actor_profile_id')
					}
					// Add named actor filters
					for (const actor of namedActors) {
						const [provider, ...rest] = actor.split(':')
						const profileId = rest.join(':')
						this.orWhere(function () {
							this.where('actor_provider', provider).where('actor_profile_id', profileId)
						})
					}
				})
			}

			return qb
		}

		// Fetch all filtered entries for grouping
		// Use a reasonable limit to prevent memory issues
		const maxEntriesForGrouping = 10000
		const rawRows = (await buildFilteredQuery()
			.select('*')
			.orderBy([
				{ column: 'actor_profile_id', order: 'asc' },
				{ column: 'actor_provider', order: 'asc' },
				{ column: 'occurred_at', order: 'asc' }
			])
			.limit(maxEntriesForGrouping)) as AuditLogRawRow[]

		// Convert to entry format
		const allEntries = rawRows.map(rawRowToAuditLogEntry)

		// Build activity groups
		const allActivityGroups = buildActivityGroups(allEntries, threshold)

		// Paginate the groups (fetch pageSize + 1 to determine hasMore)
		const startIndex = (page - 1) * pageSize
		const paginatedGroups = allActivityGroups.slice(startIndex, startIndex + pageSize + 1)

		// Check if there are more groups beyond this page
		hasMore = paginatedGroups.length > pageSize
		activityGroups = paginatedGroups.slice(0, pageSize)

		// Collect entries from paginated groups for actor resolution
		entries = activityGroups.flatMap(g => g.events)
	} else if (viewMode === 'grouped') {
		// Grouped mode: paginate by correlation groups using Knex
		// This avoids loading all entries into memory for large datasets
		const connection = em.getConnection() as AbstractSqlConnection
		const knex = connection.getKnex()

		// Build Knex query builder with filters
		const buildFilteredQuery = () => {
			const qb = knex('audit_logs')

			if (params['filter[action-type]'].length > 0) {
				qb.whereIn('action_type', params['filter[action-type]'])
			}
			if (params['filter[outcome]'].length > 0) {
				qb.whereIn('outcome', params['filter[outcome]'])
			}
			if (params['filter[severity]'].length > 0) {
				qb.whereIn('severity', params['filter[severity]'])
			}
			if (params['filter[target-resource-type]'].length > 0) {
				qb.whereIn('target_resource_type', params['filter[target-resource-type]'])
			}
			if (params['filter[from]']) {
				qb.where('occurred_at', '>=', new Date(params['filter[from]']))
			}
			if (params['filter[to]']) {
				qb.where('occurred_at', '<=', new Date(params['filter[to]']))
			}
			if (params['filter[actor]'].length > 0) {
				const actorFilters = params['filter[actor]']
				const hasAnonymous = actorFilters.includes('anonymous')
				const namedActors = actorFilters.filter(a => a !== 'anonymous')

				qb.where(function () {
					// Add anonymous filter (null actor)
					if (hasAnonymous) {
						this.orWhereNull('actor_profile_id')
					}
					// Add named actor filters
					for (const actor of namedActors) {
						const [provider, ...rest] = actor.split(':')
						const profileId = rest.join(':')
						this.orWhere(function () {
							this.where('actor_provider', provider).where('actor_profile_id', profileId)
						})
					}
				})
			}

			return qb
		}

		// Get paginated correlation IDs ordered by first occurrence (newest first)
		// Fetch pageSize + 1 to determine hasMore
		const correlationRows = (await buildFilteredQuery()
			.select('correlation_id')
			.min('occurred_at as first_occurred')
			.groupBy('correlation_id')
			.orderBy('first_occurred', 'desc')
			.limit(pageSize + 1)
			.offset((page - 1) * pageSize)) as { correlation_id: string }[]

		// Check if there are more groups beyond this page
		hasMore = correlationRows.length > pageSize
		const paginatedCorrelationIds = correlationRows
			.slice(0, pageSize)
			.map(row => row.correlation_id)

		// Step 3: Fetch only events for paginated correlation IDs
		if (paginatedCorrelationIds.length > 0) {
			const paginatedEntities = await em.find(
				AuditLog,
				{ correlationId: { $in: paginatedCorrelationIds } },
				{ orderBy: { occurredAt: 'DESC' } }
			)

			const allEntries = paginatedEntities.map(toAuditLogEntry)
			groups = buildAuditLogGroups(allEntries)

			// Sort groups by primary event time (newest first)
			groups.sort(
				(a, b) =>
					new Date(b.primaryEvent.occurredAt).getTime() -
					new Date(a.primaryEvent.occurredAt).getTime()
			)

			// Collect all entries from groups for actor resolution
			entries = allEntries
		} else {
			groups = []
		}
	} else {
		// Flat mode: fetch pageSize + 1 to determine hasMore
		const entities = await em.find(AuditLog, where, {
			orderBy: { occurredAt: 'DESC' },
			limit: pageSize + 1,
			offset: (page - 1) * pageSize
		})

		// Check if there are more entries beyond this page
		hasMore = entities.length > pageSize
		entries = entities.slice(0, pageSize).map(toAuditLogEntry)
	}

	// Log this audit log viewing (meta-logging)
	auditLogger?.log(
		auditActions.admin.viewedAuditLogs({
			actionTypes: params['filter[action-type]'],
			outcomes: params['filter[outcome]'],
			severities: params['filter[severity]'],
			targetResourceTypes: params['filter[target-resource-type]'],
			from: params['filter[from]'],
			to: params['filter[to]'],
			page,
			pageSize,
			resultCount: entries.length,
			viewMode
		})
	)

	// Resolve actor info by fetching users by their account IDs from the entries
	const actors: Record<string, ResolvedActor> = {}
	const allActors: Record<string, ResolvedActor> = {}

	try {
		const cacheOpts = { keyPrefix: `profile:${auth.profile.id}` }
		const getMe = cached(auth.client.getMe.bind(auth.client), cacheOpts)
		const getAccessibleResources = cached(
			auth.client.getAccessibleResources.bind(auth.client),
			cacheOpts
		)
		const getUsersByAccountIds = cached(
			auth.client.getUsersByAccountIds.bind(auth.client),
			cacheOpts
		)

		// First, add the current user to actors
		const currentUser = await getMe()
		const currentUserKey = `atlassian:${currentUser.account_id}`
		const currentUserActor: ResolvedActor = {
			profileId: currentUser.account_id,
			provider: 'atlassian',
			displayName: currentUser.name,
			email: currentUser.email,
			avatarUrl: currentUser.picture
		}
		actors[currentUserKey] = currentUserActor
		allActors[currentUserKey] = currentUserActor

		// Fetch ALL distinct actors from audit_logs for filter dropdown
		const distinctActorRows: { actor_profile_id: string; actor_provider: string }[] = await em
			.getConnection()
			.execute(
				`SELECT DISTINCT actor_profile_id, actor_provider
				 FROM audit_logs
				 WHERE actor_profile_id IS NOT NULL AND actor_provider IS NOT NULL`
			)

		// Get all Atlassian actor IDs (from all logs, not just current page)
		const allAtlassianActorIds = distinctActorRows
			.filter(row => row.actor_provider === 'atlassian')
			.map(row => row.actor_profile_id)
			.filter(id => id !== currentUser.account_id)

		// Extract unique Atlassian actor profile IDs from current page entries
		const pageAtlassianActorIds = [
			...new Set(
				entries
					.filter(entry => entry.actorProvider === 'atlassian' && entry.actorProfileId)
					.map(entry => entry.actorProfileId as string)
					.filter(id => id !== currentUser.account_id)
			)
		]

		// Combine all unique actor IDs for resolution
		const allUniqueActorIds = [...new Set([...allAtlassianActorIds, ...pageAtlassianActorIds])]

		// Fetch user details if there are any Atlassian actors to resolve
		if (allUniqueActorIds.length > 0) {
			const accessibleResources = await getAccessibleResources()
			const firstResource = accessibleResources[0]

			if (firstResource) {
				const users = await getUsersByAccountIds({
					accessibleResourceId: firstResource.id,
					accountIds: allUniqueActorIds
				})

				for (const user of users) {
					const actorKey = `atlassian:${user.accountId}`
					const resolvedActor: ResolvedActor = {
						profileId: user.accountId,
						provider: 'atlassian',
						displayName: user.displayName,
						email: user.emailAddress,
						avatarUrl: user.avatarUrls?.['48x48']
					}

					// Add to allActors for filter dropdown
					allActors[actorKey] = resolvedActor

					// Add to actors only if this user is on the current page
					if (pageAtlassianActorIds.includes(user.accountId)) {
						actors[actorKey] = resolvedActor
					}
				}
			}
		}
	} catch (error) {
		// Log error but continue - we'll fall back to showing profile IDs
		// biome-ignore lint/suspicious/noConsole: Server-side error logging for debugging
		console.error('[AuditLogs] Failed to resolve actors:', error)
	}

	return {
		entries: viewMode === 'flat' ? entries : undefined,
		groups: viewMode === 'grouped' ? groups : undefined,
		activityGroups: viewMode === 'activity' ? activityGroups : undefined,
		pagination: {
			page,
			pageSize,
			hasMore
		},
		params,
		actors,
		allActors,
		viewMode,
		threshold
	}
})

export default function AuditLogsPage({ loaderData }: Route.ComponentProps): React.ReactNode {
	const {
		params,
		actors,
		allActors,
		entries,
		groups,
		activityGroups,
		pagination,
		viewMode,
		threshold
	} = loaderData

	return (
		<div className='flex flex-col gap-6 p-6'>
			{/* Header */}
			<div className='flex items-center gap-3'>
				<div className='flex size-10 items-center justify-center rounded-lg bg-primary/10'>
					<FileTextIcon className='size-5 text-primary' />
				</div>
				<div>
					<h1 className='text-xl font-semibold'>Audit Logs</h1>
					<p className='text-sm text-muted-foreground'>View system activity and security events</p>
				</div>
			</div>

			{/* Filters */}
			<AuditLogFilters
				params={params}
				viewMode={viewMode}
				allActors={allActors}
				threshold={threshold}
			/>

			{/* Table */}
			{viewMode === 'activity' && activityGroups ? (
				<AuditLogActivityTable
					groups={activityGroups}
					pagination={pagination}
					actors={actors}
				/>
			) : viewMode === 'grouped' && groups ? (
				<AuditLogGroupedTable
					groups={groups}
					pagination={pagination}
					actors={actors}
				/>
			) : (
				<AuditLogTable
					data={{ entries: entries ?? [], pagination }}
					actors={actors}
				/>
			)}
		</div>
	)
}
