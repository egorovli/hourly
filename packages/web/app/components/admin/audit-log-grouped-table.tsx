import type {
	AuditLogEntry,
	AuditLogGroup,
	AuditLogPagination,
	ResolvedActor
} from '~/domain/index.ts'

import { useCallback, useEffect, useState } from 'react'
import {
	AlertCircleIcon,
	ChevronDownIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	EyeIcon
} from 'lucide-react'
import { useSearchParams } from 'react-router'

import { AuditLogDetailSheet } from '~/components/admin/audit-log-detail-sheet.tsx'
import {
	ActionTypeBadge,
	AUDIT_LOG_MAX_VISIBLE_EVENTS,
	DurationBadge,
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

	// Sheet state for full detail view
	const [sheetEntry, setSheetEntry] = useState<AuditLogEntry | undefined>(undefined)
	const [sheetOpen, setSheetOpen] = useState(false)

	// Responsive detection for sheet side
	const [isMobile, setIsMobile] = useState(false)

	useEffect(() => {
		const checkMobile = () => setIsMobile(window.innerWidth < 768)
		checkMobile()
		window.addEventListener('resize', checkMobile)
		return () => window.removeEventListener('resize', checkMobile)
	}, [])

	function goToPage(page: number): void {
		const newParams = new URLSearchParams(searchParams)
		newParams.set('page[number]', page.toString())
		setSearchParams(newParams)
	}

	const openDetailSheet = useCallback((entry: AuditLogEntry) => {
		setSheetEntry(entry)
		setSheetOpen(true)
	}, [])

	const canGoPrev = pagination.page > 1
	const canGoNext = pagination.page < pagination.totalPages

	// Get actor for sheet
	const sheetActorKey =
		sheetEntry?.actorProvider && sheetEntry?.actorProfileId
			? `${sheetEntry.actorProvider}:${sheetEntry.actorProfileId}`
			: undefined
	const sheetActor = sheetActorKey ? actors?.[sheetActorKey] : undefined

	if (groups.length === 0) {
		return (
			<div className='flex flex-col items-center justify-center rounded-lg border border-dashed py-12'>
				<p className='text-sm text-muted-foreground'>No audit log entries found</p>
			</div>
		)
	}

	return (
		<>
			<div className='space-y-4'>
				<div className='space-y-2'>
					{groups.map(group => (
						<AuditLogGroupRow
							key={group.correlationId}
							group={group}
							actors={actors}
							onViewDetails={openDetailSheet}
						/>
					))}
				</div>

				{/* Pagination */}
				<div className='flex items-center justify-between'>
					<p className='text-sm text-muted-foreground'>
						Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
						{Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
						{pagination.total} groups
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

			{/* Detail Sheet */}
			<AuditLogDetailSheet
				open={sheetOpen}
				onOpenChange={setSheetOpen}
				entry={sheetEntry}
				actor={sheetActor}
				isMobile={isMobile}
			/>
		</>
	)
}

interface AuditLogGroupRowProps {
	group: AuditLogGroup
	actors?: Record<string, ResolvedActor>
	onViewDetails: (entry: AuditLogEntry) => void
}

function AuditLogGroupRow({
	group,
	actors,
	onViewDetails
}: AuditLogGroupRowProps): React.ReactNode {
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
										className='text-left py-2 pr-4 font-medium'
									>
										Duration
									</th>
									<th
										scope='col'
										className='text-left py-2 pr-4 font-medium'
									>
										Outcome
									</th>
									<th
										scope='col'
										className='text-left py-2 font-medium w-8'
									>
										<span className='sr-only'>Actions</span>
									</th>
								</tr>
							</thead>
							<tbody className='divide-y divide-border/50'>
								{visibleEvents.map((event, index) => (
									<GroupedEventRow
										key={event.id}
										event={event}
										sequenceIndex={index + 1}
										onViewDetails={() => onViewDetails(event)}
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
	onViewDetails: () => void
}

function GroupedEventRow({
	event,
	sequenceIndex,
	onViewDetails
}: GroupedEventRowProps): React.ReactNode {
	return (
		<tr className='text-sm hover:bg-muted/30 transition-colors'>
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
			<td className='py-2 pr-4'>
				<DurationBadge ms={event.durationMs} />
			</td>
			<td className='py-2 pr-4'>
				<div className='flex items-center gap-1.5'>
					<OutcomeIcon outcome={event.outcome} />
					<span className='capitalize text-xs'>{event.outcome}</span>
				</div>
			</td>
			<td className='py-2'>
				<Button
					variant='ghost'
					size='icon'
					className='size-6'
					onClick={e => {
						e.stopPropagation()
						onViewDetails()
					}}
				>
					<EyeIcon className='size-3.5' />
					<span className='sr-only'>View details</span>
				</Button>
			</td>
		</tr>
	)
}
