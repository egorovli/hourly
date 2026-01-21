import type { Route } from './+types/admin.audit-logs.ts'
import type {
	AuditLogEntry,
	AuditLogLoaderResponse,
	AuditLogQueryParams,
	ResolvedActor
} from '~/domain/index.ts'

import { FileTextIcon } from 'lucide-react'

import { AuditLogFilters } from '~/components/admin/audit-log-filters.tsx'
import { AuditLogTable } from '~/components/admin/audit-log-table.tsx'
import { ProfileConnectionType } from '~/domain/index.ts'
import { AtlassianClient } from '~/lib/atlassian/index.ts'
import { cached } from '~/lib/cached/index.ts'
import { createSessionStorage } from '~/lib/session/index.ts'

import {
	AuditLogActionType,
	AuditLogOutcome,
	AuditLogTargetResourceType,
	auditLogQuerySchema
} from '~/domain/index.ts'

import {
	orm,
	ProfileSessionConnection,
	Session,
	Token,
	withRequestContext
} from '~/lib/mikro-orm/index.ts'

// Mock data generator for demonstration
function generateMockEntries(params: AuditLogQueryParams): {
	entries: AuditLogEntry[]
	pagination: { page: number; pageSize: number; total: number; totalPages: number }
} {
	const allEntries = createMockEntries()

	// Apply filters
	let filtered = allEntries

	if (params['filter[action-type]'].length > 0) {
		const actionTypes = new Set(params['filter[action-type]'])
		filtered = filtered.filter(e => actionTypes.has(e.actionType))
	}

	if (params['filter[outcome]'].length > 0) {
		const outcomes = new Set(params['filter[outcome]'])
		filtered = filtered.filter(e => outcomes.has(e.outcome))
	}

	if (params['filter[target-resource-type]'].length > 0) {
		const resourceTypes = new Set(params['filter[target-resource-type]'])
		filtered = filtered.filter(e => resourceTypes.has(e.targetResourceType))
	}

	if (params['filter[from]']) {
		const fromDate = new Date(params['filter[from]'])
		filtered = filtered.filter(e => new Date(e.occurredAt) >= fromDate)
	}

	if (params['filter[to]']) {
		const toDate = new Date(params['filter[to]'])
		filtered = filtered.filter(e => new Date(e.occurredAt) <= toDate)
	}

	// Pagination
	const page = params['page[number]']
	const pageSize = params['page[size]']
	const total = filtered.length
	const totalPages = Math.ceil(total / pageSize)
	const startIndex = (page - 1) * pageSize
	const entries = filtered.slice(startIndex, startIndex + pageSize)

	return {
		entries,
		pagination: {
			page,
			pageSize,
			total,
			totalPages
		}
	}
}

function createMockEntries(): AuditLogEntry[] {
	const now = new Date()
	const entries: AuditLogEntry[] = []

	// Authentication events
	entries.push({
		id: crypto.randomUUID(),
		actorProfileId: '6242e240699649006ae56ef4',
		actorProvider: 'atlassian',
		actionType: AuditLogActionType.Authentication,
		actionDescription: 'User signed in via Atlassian OAuth',
		targetResourceType: AuditLogTargetResourceType.Session,
		targetResourceId: 'sess_abc123',
		outcome: AuditLogOutcome.Success,
		occurredAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString()
	})

	entries.push({
		id: crypto.randomUUID(),
		actorProfileId: 'user_xyz789',
		actorProvider: 'gitlab',
		actionType: AuditLogActionType.Authentication,
		actionDescription: 'User signed in via GitLab OAuth',
		targetResourceType: AuditLogTargetResourceType.Session,
		targetResourceId: 'sess_def456',
		outcome: AuditLogOutcome.Success,
		occurredAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString()
	})

	entries.push({
		id: crypto.randomUUID(),
		actorProfileId: 'unknown',
		actorProvider: 'atlassian',
		actionType: AuditLogActionType.Authentication,
		actionDescription: 'Failed login attempt - invalid credentials',
		targetResourceType: AuditLogTargetResourceType.Session,
		outcome: AuditLogOutcome.Failure,
		occurredAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString()
	})

	// Authorization events
	entries.push({
		id: crypto.randomUUID(),
		actorProfileId: '6242e240699649006ae56ef4',
		actorProvider: 'atlassian',
		actionType: AuditLogActionType.Authorization,
		actionDescription: 'Admin accessed audit logs',
		targetResourceType: AuditLogTargetResourceType.AuditLog,
		outcome: AuditLogOutcome.Success,
		occurredAt: new Date(now.getTime() - 2 * 60 * 1000).toISOString()
	})

	entries.push({
		id: crypto.randomUUID(),
		actorProfileId: 'user_abc123',
		actorProvider: 'atlassian',
		actionType: AuditLogActionType.Authorization,
		actionDescription: 'Non-admin attempted to access admin panel',
		targetResourceType: AuditLogTargetResourceType.AuditLog,
		outcome: AuditLogOutcome.Failure,
		occurredAt: new Date(now.getTime() - 45 * 60 * 1000).toISOString()
	})

	// Data modification events
	entries.push({
		id: crypto.randomUUID(),
		actorProfileId: '6242e240699649006ae56ef4',
		actorProvider: 'atlassian',
		actionType: AuditLogActionType.DataModification,
		actionDescription: 'Created worklog entry for PROJ-123',
		targetResourceType: AuditLogTargetResourceType.Worklog,
		targetResourceId: 'worklog_789',
		outcome: AuditLogOutcome.Success,
		occurredAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString()
	})

	entries.push({
		id: crypto.randomUUID(),
		actorProfileId: '6242e240699649006ae56ef4',
		actorProvider: 'atlassian',
		actionType: AuditLogActionType.DataModification,
		actionDescription: 'Updated worklog entry for PROJ-456',
		targetResourceType: AuditLogTargetResourceType.Worklog,
		targetResourceId: 'worklog_456',
		outcome: AuditLogOutcome.Success,
		occurredAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
	})

	entries.push({
		id: crypto.randomUUID(),
		actorProfileId: 'user_xyz789',
		actorProvider: 'gitlab',
		actionType: AuditLogActionType.DataModification,
		actionDescription: 'Deleted worklog entry',
		targetResourceType: AuditLogTargetResourceType.Worklog,
		targetResourceId: 'worklog_old123',
		outcome: AuditLogOutcome.Success,
		occurredAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString()
	})

	// Configuration events
	entries.push({
		id: crypto.randomUUID(),
		actorProfileId: '6242e240699649006ae56ef4',
		actorProvider: 'atlassian',
		actionType: AuditLogActionType.Configuration,
		actionDescription: 'Updated user preferences',
		targetResourceType: AuditLogTargetResourceType.Preferences,
		targetResourceId: 'pref_user123',
		outcome: AuditLogOutcome.Success,
		occurredAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString()
	})

	// Integration events
	entries.push({
		id: crypto.randomUUID(),
		actorProfileId: '6242e240699649006ae56ef4',
		actorProvider: 'atlassian',
		actionType: AuditLogActionType.Integration,
		actionDescription: 'Connected GitLab integration',
		targetResourceType: AuditLogTargetResourceType.Integration,
		targetResourceId: 'int_gitlab_main',
		outcome: AuditLogOutcome.Success,
		occurredAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
	})

	entries.push({
		id: crypto.randomUUID(),
		actorProfileId: 'user_xyz789',
		actorProvider: 'gitlab',
		actionType: AuditLogActionType.Integration,
		actionDescription: 'Failed to sync with Jira - API rate limit',
		targetResourceType: AuditLogTargetResourceType.Integration,
		outcome: AuditLogOutcome.Failure,
		occurredAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()
	})

	entries.push({
		id: crypto.randomUUID(),
		actorProfileId: 'system',
		actorProvider: 'internal',
		actionType: AuditLogActionType.Integration,
		actionDescription: 'Token refresh in progress',
		targetResourceType: AuditLogTargetResourceType.Token,
		targetResourceId: 'token_abc123',
		outcome: AuditLogOutcome.Pending,
		occurredAt: new Date(now.getTime() - 10 * 1000).toISOString()
	})

	// Administration events
	entries.push({
		id: crypto.randomUUID(),
		actorProfileId: '6242e240699649006ae56ef4',
		actorProvider: 'atlassian',
		actionType: AuditLogActionType.Administration,
		actionDescription: 'Viewed system audit logs',
		targetResourceType: AuditLogTargetResourceType.AuditLog,
		outcome: AuditLogOutcome.Success,
		occurredAt: new Date(now.getTime() - 1 * 60 * 1000).toISOString()
	})

	// Sort by occurredAt descending (most recent first)
	entries.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())

	return entries
}

export const loader = withRequestContext(async function loader({
	request
}: Route.LoaderArgs): Promise<AuditLogLoaderResponse> {
	const url = new URL(request.url)

	// Parse array params using getAll
	const rawParams = {
		'filter[action-type]': url.searchParams.getAll('filter[action-type]'),
		'filter[outcome]': url.searchParams.getAll('filter[outcome]'),
		'filter[target-resource-type]': url.searchParams.getAll('filter[target-resource-type]'),
		'filter[from]': url.searchParams.get('filter[from]') ?? undefined,
		'filter[to]': url.searchParams.get('filter[to]') ?? undefined,
		'page[number]': url.searchParams.get('page[number]') ?? undefined,
		'page[size]': url.searchParams.get('page[size]') ?? undefined
	}

	const params = await auditLogQuerySchema.parseAsync(rawParams)
	const data = generateMockEntries(params)

	// Resolve actor info from session
	const actors: Record<string, ResolvedActor> = {}

	const { em } = orm
	const sessionStorage = createSessionStorage()
	const cookieSession = await sessionStorage.getSession(request.headers.get('Cookie'))

	if (cookieSession?.id) {
		const session = await em.findOne(Session, { id: cookieSession.id })

		if (session) {
			const connection = await em.findOne(
				ProfileSessionConnection,
				{
					session: { id: session.id },
					connectionType: ProfileConnectionType.WorklogTarget
				},
				{ populate: ['profile'] }
			)

			if (connection) {
				const { profile } = connection

				const token = await em.findOne(Token, {
					profileId: profile.id,
					provider: profile.provider
				})

				if (token && profile.provider === 'atlassian') {
					try {
						const client = new AtlassianClient({ accessToken: token.accessToken })
						const cacheOpts = { keyPrefix: `profile:${profile.id}` }
						const getMe = cached(client.getMe.bind(client), cacheOpts)
						const user = await getMe()

						// Create actor key for current user
						const actorKey = `${profile.provider}:${profile.id}`
						actors[actorKey] = {
							profileId: profile.id,
							provider: profile.provider,
							displayName: user.name,
							avatarUrl: user.picture
						}
					} catch {
						// Silently fail - we'll just show the profile ID
					}
				}
			}
		}
	}

	return {
		entries: data.entries,
		pagination: data.pagination,
		params,
		actors
	}
})

export default function AuditLogsPage({ loaderData }: Route.ComponentProps): React.ReactNode {
	const { params, actors, ...data } = loaderData

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
			<AuditLogFilters params={params} />

			{/* Table */}
			<AuditLogTable
				data={data}
				actors={actors}
			/>
		</div>
	)
}
