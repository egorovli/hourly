import type { AuditLogEntry, AuditLogListResponse, ResolvedActor } from '~/domain/index.ts'

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useSearchParams } from 'react-router'

import {
	ActionTypeBadge,
	formatDate,
	formatRelativeTime,
	getInitials,
	OutcomeIcon,
	ProviderBadge,
	SeverityBadge
} from '~/components/admin/audit-log-utils.tsx'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/shadcn/ui/avatar.tsx'
import { Button } from '~/components/shadcn/ui/button.tsx'

export interface AuditLogTableProps {
	data: AuditLogListResponse
	actors?: Record<string, ResolvedActor>
}

export function AuditLogTable({ data, actors }: AuditLogTableProps): React.ReactNode {
	const { entries, pagination } = data
	const [searchParams, setSearchParams] = useSearchParams()

	function goToPage(page: number): void {
		const newParams = new URLSearchParams(searchParams)
		newParams.set('page[number]', page.toString())
		setSearchParams(newParams)
	}

	const canGoPrev = pagination.page > 1
	const canGoNext = pagination.page < pagination.totalPages

	if (entries.length === 0) {
		return (
			<div className='flex flex-col items-center justify-center rounded-lg border border-dashed py-12'>
				<p className='text-sm text-muted-foreground'>No audit log entries found</p>
			</div>
		)
	}

	return (
		<div className='space-y-4'>
			<div className='overflow-x-auto rounded-lg border'>
				<table className='w-full'>
					<thead className='bg-muted/50'>
						<tr>
							<th
								scope='col'
								className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground'
							>
								Timestamp
							</th>
							<th
								scope='col'
								className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground'
							>
								Actor
							</th>
							<th
								scope='col'
								className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground'
							>
								Action
							</th>
							<th
								scope='col'
								className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground'
							>
								Severity
							</th>
							<th
								scope='col'
								className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground'
							>
								Target
							</th>
							<th
								scope='col'
								className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground'
							>
								Outcome
							</th>
						</tr>
					</thead>
					<tbody className='divide-y divide-border'>
						{entries.map(entry => (
							<AuditLogRow
								key={entry.id}
								entry={entry}
								actors={actors}
							/>
						))}
					</tbody>
				</table>
			</div>

			{/* Pagination */}
			<div className='flex items-center justify-between'>
				<p className='text-sm text-muted-foreground'>
					Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
					{Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}{' '}
					entries
				</p>

				<div className='flex items-center gap-2'>
					<Button
						variant='outline'
						size='sm'
						onClick={() => goToPage(pagination.page - 1)}
						disabled={!canGoPrev}
					>
						<ChevronLeftIcon className='mr-1 size-4' />
						Previous
					</Button>

					<span className='text-sm text-muted-foreground'>
						Page {pagination.page} of {pagination.totalPages}
					</span>

					<Button
						variant='outline'
						size='sm'
						onClick={() => goToPage(pagination.page + 1)}
						disabled={!canGoNext}
					>
						Next
						<ChevronRightIcon className='ml-1 size-4' />
					</Button>
				</div>
			</div>
		</div>
	)
}

interface AuditLogRowProps {
	entry: AuditLogEntry
	actors?: Record<string, ResolvedActor>
}

function AuditLogRow({ entry, actors }: AuditLogRowProps): React.ReactNode {
	// Look up resolved actor info (only if we have both provider and profileId)
	const actorKey =
		entry.actorProvider && entry.actorProfileId
			? `${entry.actorProvider}:${entry.actorProfileId}`
			: undefined
	const resolvedActor = actorKey ? actors?.[actorKey] : undefined

	// Determine display text: prefer displayName, then email, then profileId, then 'Anonymous'
	const displayName =
		resolvedActor?.displayName ?? resolvedActor?.email ?? entry.actorProfileId ?? 'Anonymous'
	const showEmail = resolvedActor?.displayName && resolvedActor?.email
	const initials = getInitials(resolvedActor?.displayName, resolvedActor?.email)

	return (
		<tr className='hover:bg-muted/30'>
			<td className='px-4 py-3 text-sm'>
				<div className='flex flex-col'>
					<span>{formatDate(entry.occurredAt)}</span>
					<span className='text-xs text-muted-foreground'>
						{formatRelativeTime(entry.occurredAt)}
					</span>
				</div>
			</td>
			<td className='px-4 py-3 text-sm'>
				<div className='flex items-center gap-3'>
					<Avatar className='size-8'>
						<AvatarImage
							src={resolvedActor?.avatarUrl}
							alt={displayName}
						/>
						<AvatarFallback className='text-xs'>{initials}</AvatarFallback>
					</Avatar>
					<div className='flex flex-col'>
						<div className='flex items-center gap-2'>
							<span className='font-medium'>{displayName}</span>
							<ProviderBadge provider={entry.actorProvider} />
						</div>
						{showEmail && (
							<span className='text-xs text-muted-foreground'>{resolvedActor.email}</span>
						)}
					</div>
				</div>
			</td>
			<td className='px-4 py-3 text-sm'>
				<div className='flex flex-col gap-1'>
					<ActionTypeBadge actionType={entry.actionType} />
					<span className='text-xs text-muted-foreground'>{entry.actionDescription}</span>
				</div>
			</td>
			<td className='px-4 py-3 text-sm'>
				<SeverityBadge severity={entry.severity} />
			</td>
			<td className='px-4 py-3 text-sm'>
				<div className='flex flex-col'>
					<span className='capitalize'>{entry.targetResourceType.replace('-', ' ')}</span>
					{entry.targetResourceId && (
						<span className='font-mono text-xs text-muted-foreground'>
							{entry.targetResourceId}
						</span>
					)}
				</div>
			</td>
			<td className='px-4 py-3 text-sm'>
				<div className='flex items-center gap-2'>
					<OutcomeIcon outcome={entry.outcome} />
					<span className='capitalize'>{entry.outcome}</span>
				</div>
			</td>
		</tr>
	)
}
