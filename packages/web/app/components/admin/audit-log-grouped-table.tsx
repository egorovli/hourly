import type {
	AuditLogEntry,
	AuditLogGroup,
	AuditLogPagination,
	ResolvedActor
} from '~/domain/index.ts'

import { AlertCircleIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'

import {
	ActionTypeBadge,
	AUDIT_LOG_MAX_VISIBLE_EVENTS,
	formatDate,
	formatRelativeTime,
	formatTime,
	getInitials,
	OutcomeIcon,
	ProviderBadge,
	SeverityBadge
} from '~/components/admin/audit-log-utils.tsx'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/shadcn/ui/avatar.tsx'
import { Badge } from '~/components/shadcn/ui/badge.tsx'
import { Button } from '~/components/shadcn/ui/button.tsx'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from '~/components/shadcn/ui/collapsible.tsx'
import { cn } from '~/lib/util/index.ts'

export interface AuditLogGroupedTableProps {
	groups: AuditLogGroup[]
	pagination: AuditLogPagination
	actors?: Record<string, ResolvedActor>
}

export function AuditLogGroupedTable({
	groups,
	pagination,
	actors
}: AuditLogGroupedTableProps): React.ReactNode {
	const [searchParams, setSearchParams] = useSearchParams()

	function goToPage(page: number): void {
		const newParams = new URLSearchParams(searchParams)
		newParams.set('page[number]', page.toString())
		setSearchParams(newParams)
	}

	const canGoPrev = pagination.page > 1
	const canGoNext = pagination.page < pagination.totalPages

	if (groups.length === 0) {
		return (
			<div className='flex flex-col items-center justify-center rounded-lg border border-dashed py-12'>
				<p className='text-sm text-muted-foreground'>No audit log entries found</p>
			</div>
		)
	}

	return (
		<div className='space-y-4'>
			<div className='space-y-2'>
				{groups.map(group => (
					<AuditLogGroupRow
						key={group.correlationId}
						group={group}
						actors={actors}
					/>
				))}
			</div>

			{/* Pagination */}
			<div className='flex items-center justify-between'>
				<p className='text-sm text-muted-foreground'>
					Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
					{Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}{' '}
					groups
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

interface AuditLogGroupRowProps {
	group: AuditLogGroup
	actors?: Record<string, ResolvedActor>
}

function AuditLogGroupRow({ group, actors }: AuditLogGroupRowProps): React.ReactNode {
	const [isOpen, setIsOpen] = useState(false)
	const [showAllEvents, setShowAllEvents] = useState(false)
	const { primaryEvent, events, eventCount, hasFailure, highestSeverity } = group

	// Look up resolved actor info
	const actorKey =
		primaryEvent.actorProvider && primaryEvent.actorProfileId
			? `${primaryEvent.actorProvider}:${primaryEvent.actorProfileId}`
			: undefined
	const resolvedActor = actorKey ? actors?.[actorKey] : undefined

	const displayName =
		resolvedActor?.displayName ?? resolvedActor?.email ?? primaryEvent.actorProfileId ?? 'Anonymous'
	const initials = getInitials(resolvedActor?.displayName, resolvedActor?.email)

	// Limit visible events unless "show all" is toggled
	const hasMoreEvents = events.length > AUDIT_LOG_MAX_VISIBLE_EVENTS
	const visibleEvents = showAllEvents ? events : events.slice(0, AUDIT_LOG_MAX_VISIBLE_EVENTS)
	const hiddenEventCount = events.length - AUDIT_LOG_MAX_VISIBLE_EVENTS

	// Build accessibility label
	const a11yLabel = `${primaryEvent.actionDescription}, ${eventCount} ${eventCount === 1 ? 'event' : 'events'}${hasFailure ? ', contains failures' : ''}. Click to ${isOpen ? 'collapse' : 'expand'}`

	return (
		<Collapsible
			open={isOpen}
			onOpenChange={setIsOpen}
		>
			<div className='rounded-lg border'>
				<CollapsibleTrigger asChild>
					<button
						type='button'
						aria-expanded={isOpen}
						aria-label={a11yLabel}
						className='flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
					>
						<ChevronDownIcon
							aria-hidden='true'
							className={cn(
								'size-4 text-muted-foreground transition-transform',
								isOpen && 'rotate-180'
							)}
						/>

						{/* Timestamp */}
						<div className='flex flex-col min-w-[120px]'>
							<span className='text-sm'>{formatDate(primaryEvent.occurredAt)}</span>
							<span className='text-xs text-muted-foreground'>
								{formatRelativeTime(primaryEvent.occurredAt)}
							</span>
						</div>

						{/* Actor */}
						<div className='flex items-center gap-2 min-w-[180px]'>
							<Avatar className='size-7'>
								<AvatarImage
									src={resolvedActor?.avatarUrl}
									alt={displayName}
								/>
								<AvatarFallback className='text-xs'>{initials}</AvatarFallback>
							</Avatar>
							<div className='flex flex-col'>
								<span className='text-sm font-medium'>{displayName}</span>
								<ProviderBadge provider={primaryEvent.actorProvider} />
							</div>
						</div>

						{/* Primary Action */}
						<div className='flex flex-col gap-1 flex-1 min-w-0'>
							<div className='flex items-center gap-2'>
								<ActionTypeBadge actionType={primaryEvent.actionType} />
								<SeverityBadge severity={highestSeverity} />
							</div>
							<span className='text-xs text-muted-foreground truncate'>
								{primaryEvent.actionDescription}
							</span>
						</div>

						{/* Event Count & Failure Indicator */}
						<div className='flex items-center gap-2'>
							<Badge
								variant='outline'
								className='font-normal'
							>
								{eventCount} {eventCount === 1 ? 'event' : 'events'}
							</Badge>
							{hasFailure && (
								<AlertCircleIcon
									aria-label='Contains failures'
									className='size-4 text-destructive'
								/>
							)}
						</div>
					</button>
				</CollapsibleTrigger>

				<CollapsibleContent>
					<div className='border-t px-4 py-2 bg-muted/20'>
						<table className='w-full'>
							<thead>
								<tr className='text-xs text-muted-foreground'>
									<th
										scope='col'
										className='text-left py-2 pr-4 font-medium'
									>
										#
									</th>
									<th
										scope='col'
										className='text-left py-2 pr-4 font-medium'
									>
										Time
									</th>
									<th
										scope='col'
										className='text-left py-2 pr-4 font-medium'
									>
										Action
									</th>
									<th
										scope='col'
										className='text-left py-2 pr-4 font-medium'
									>
										Target
									</th>
									<th
										scope='col'
										className='text-left py-2 font-medium'
									>
										Outcome
									</th>
								</tr>
							</thead>
							<tbody className='divide-y divide-border/50'>
								{visibleEvents.map((event, index) => (
									<GroupedEventRow
										key={event.id}
										event={event}
										sequenceIndex={index + 1}
									/>
								))}
							</tbody>
						</table>

						{/* Show more button */}
						{hasMoreEvents && !showAllEvents && (
							<div className='pt-2 border-t border-border/50'>
								<Button
									variant='ghost'
									size='sm'
									onClick={e => {
										e.stopPropagation()
										setShowAllEvents(true)
									}}
									className='w-full'
								>
									Show all {events.length} events ({hiddenEventCount} more)
								</Button>
							</div>
						)}
					</div>
				</CollapsibleContent>
			</div>
		</Collapsible>
	)
}

interface GroupedEventRowProps {
	event: AuditLogEntry
	sequenceIndex: number
}

function GroupedEventRow({ event, sequenceIndex }: GroupedEventRowProps): React.ReactNode {
	return (
		<tr className='text-sm'>
			<td className='py-2 pr-4 text-muted-foreground'>{sequenceIndex}</td>
			<td className='py-2 pr-4'>
				<span className='text-xs'>{formatTime(event.occurredAt)}</span>
			</td>
			<td className='py-2 pr-4'>
				<div className='flex flex-col gap-0.5'>
					<ActionTypeBadge actionType={event.actionType} />
					<span className='text-xs text-muted-foreground'>{event.actionDescription}</span>
				</div>
			</td>
			<td className='py-2 pr-4'>
				<div className='flex flex-col'>
					<span className='capitalize text-xs'>{event.targetResourceType.replace('-', ' ')}</span>
					{event.targetResourceId && (
						<span className='font-mono text-xs text-muted-foreground'>
							{event.targetResourceId}
						</span>
					)}
				</div>
			</td>
			<td className='py-2'>
				<div className='flex items-center gap-1.5'>
					<OutcomeIcon outcome={event.outcome} />
					<span className='capitalize text-xs'>{event.outcome}</span>
				</div>
			</td>
		</tr>
	)
}
