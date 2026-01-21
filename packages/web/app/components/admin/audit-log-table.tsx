import type { AuditLogEntry, AuditLogListResponse, ResolvedActor } from '~/domain/index.ts'

import { useSearchParams } from 'react-router'
import {
	AlertCircleIcon,
	CheckCircle2Icon,
	ChevronLeftIcon,
	ChevronRightIcon,
	ClockIcon
} from 'lucide-react'

import { Badge } from '~/components/shadcn/ui/badge.tsx'
import { Button } from '~/components/shadcn/ui/button.tsx'
import { AuditLogOutcome } from '~/domain/index.ts'

function formatTimestamp(isoString: string): string {
	const date = new Date(isoString)

	return date.toLocaleString('en-US', {
		year: 'numeric',
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	})
}

function OutcomeIcon({ outcome }: { outcome: AuditLogOutcome }): React.ReactNode {
	switch (outcome) {
		case AuditLogOutcome.Success:
			return <CheckCircle2Icon className='size-4 text-green-600' />
		case AuditLogOutcome.Failure:
			return <AlertCircleIcon className='size-4 text-destructive' />
		case AuditLogOutcome.Pending:
			return <ClockIcon className='size-4 text-amber-500' />
		default:
			return null
	}
}

function ActionTypeBadge({ actionType }: { actionType: string }): React.ReactNode {
	const label = actionType
		.split('-')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')

	return (
		<Badge
			variant='secondary'
			className='font-normal'
		>
			{label}
		</Badge>
	)
}

function ProviderBadge({ provider }: { provider: string }): React.ReactNode {
	const variant = provider === 'atlassian' ? 'default' : 'secondary'

	return (
		<Badge
			variant={variant}
			className='font-normal text-[10px] px-1 py-0'
		>
			{provider}
		</Badge>
	)
}

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
			<div className='overflow-hidden rounded-lg border'>
				<table className='w-full'>
					<thead className='bg-muted/50'>
						<tr>
							<th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground'>
								Timestamp
							</th>
							<th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground'>
								Actor
							</th>
							<th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground'>
								Action
							</th>
							<th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground'>
								Target
							</th>
							<th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground'>
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
	// Look up resolved actor info
	const actorKey = `${entry.actorProvider}:${entry.actorProfileId}`
	const resolvedActor = actors?.[actorKey]

	return (
		<tr className='hover:bg-muted/30'>
			<td className='whitespace-nowrap px-4 py-3 text-sm'>{formatTimestamp(entry.occurredAt)}</td>
			<td className='px-4 py-3 text-sm'>
				<div className='flex flex-col gap-1'>
					<div className='flex items-center gap-2'>
						{resolvedActor?.displayName ? (
							<>
								<span className='font-medium'>{resolvedActor.displayName}</span>
								<ProviderBadge provider={entry.actorProvider} />
							</>
						) : (
							<>
								<span className='font-mono text-xs'>{entry.actorProfileId}</span>
								<ProviderBadge provider={entry.actorProvider} />
							</>
						)}
					</div>
					{resolvedActor?.displayName && (
						<span className='font-mono text-xs text-muted-foreground truncate max-w-[150px]'>
							({entry.actorProfileId})
						</span>
					)}
				</div>
			</td>
			<td className='px-4 py-3 text-sm'>
				<div className='flex flex-col gap-1'>
					<ActionTypeBadge actionType={entry.actionType} />
					<span className='text-xs text-muted-foreground'>{entry.actionDescription}</span>
				</div>
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
