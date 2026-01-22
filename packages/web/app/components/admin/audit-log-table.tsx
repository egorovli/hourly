import type { AuditLogEntry, AuditLogListResponse, ResolvedActor } from '~/domain/index.ts'

import { Fragment, useCallback, useEffect, useState } from 'react'
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useSearchParams } from 'react-router'

import { AuditLogDetailSheet } from '~/components/admin/audit-log-detail-sheet.tsx'
import { AuditLogExpandedRow } from '~/components/admin/audit-log-expanded-row.tsx'
import {
	ActionTypeBadge,
	DurationBadge,
	formatDate,
	formatRelativeTime,
	getInitials,
	OutcomeIcon,
	ProviderBadge,
	SeverityBadge
} from '~/components/admin/audit-log-utils.tsx'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/shadcn/ui/avatar.tsx'
import { Button } from '~/components/shadcn/ui/button.tsx'
import { cn } from '~/lib/util/index.ts'

const TABLE_COLUMN_COUNT = 7

export interface AuditLogTableProps {
	data: AuditLogListResponse
	actors?: Record<string, ResolvedActor>
}

export function AuditLogTable({ data, actors }: AuditLogTableProps): React.ReactNode {
	const { entries, pagination } = data
	const [searchParams, setSearchParams] = useSearchParams()

	// Expand state for inline row details
	const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

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
		setSearchParams(newParams, { preventScrollReset: true })
	}

	const toggleRow = useCallback((id: string) => {
		setExpandedRows(prev => {
			const next = new Set(prev)
			if (next.has(id)) {
				next.delete(id)
			} else {
				next.add(id)
			}
			return next
		})
	}, [])

	const openDetailSheet = useCallback((entry: AuditLogEntry) => {
		setSheetEntry(entry)
		setSheetOpen(true)
	}, [])

	// Keyboard navigation for expanded rows
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent, entry: AuditLogEntry) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault()
				toggleRow(entry.id)
			} else if (e.key === 'Escape') {
				setExpandedRows(prev => {
					const next = new Set(prev)
					next.delete(entry.id)
					return next
				})
			}
		},
		[toggleRow]
	)

	const canGoPrev = pagination.page > 1
	const canGoNext = pagination.hasMore

	if (entries.length === 0) {
		return (
			<div className='flex flex-col items-center justify-center rounded-lg border border-dashed py-12'>
				<p className='text-sm text-muted-foreground'>No audit log entries found</p>
			</div>
		)
	}

	// Get actor for sheet
	const sheetActorKey =
		sheetEntry?.actorProvider && sheetEntry?.actorProfileId
			? `${sheetEntry.actorProvider}:${sheetEntry.actorProfileId}`
			: undefined
	const sheetActor = sheetActorKey ? actors?.[sheetActorKey] : undefined

	return (
		<>
			<div className='space-y-4'>
				<div className='overflow-x-auto rounded-lg border'>
					<table className='w-full'>
						<thead className='bg-muted/50'>
							<tr>
								<th
									scope='col'
									className='w-8 px-2 py-3'
								>
									<span className='sr-only'>Expand</span>
								</th>
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
									Duration
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
							{entries.map(entry => {
								const isExpanded = expandedRows.has(entry.id)
								return (
									<Fragment key={entry.id}>
										<AuditLogRow
											entry={entry}
											actors={actors}
											isExpanded={isExpanded}
											onToggle={() => toggleRow(entry.id)}
											onKeyDown={e => handleKeyDown(e, entry)}
										/>
										{isExpanded && (
											<AuditLogExpandedRow
												entry={entry}
												colspan={TABLE_COLUMN_COUNT + 1}
												onViewDetails={() => openDetailSheet(entry)}
											/>
										)}
									</Fragment>
								)
							})}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				{(canGoPrev || canGoNext) && (
					<div className='flex items-center justify-end gap-2'>
						<Button
							variant='outline'
							size='sm'
							onClick={() => goToPage(pagination.page - 1)}
							disabled={!canGoPrev}
						>
							<ChevronLeftIcon className='mr-1 size-4' />
							Previous
						</Button>

						<span className='text-sm text-muted-foreground'>Page {pagination.page}</span>

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
				)}
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

interface AuditLogRowProps {
	entry: AuditLogEntry
	actors?: Record<string, ResolvedActor>
	isExpanded: boolean
	onToggle: () => void
	onKeyDown: (e: React.KeyboardEvent) => void
}

function AuditLogRow({
	entry,
	actors,
	isExpanded,
	onToggle,
	onKeyDown
}: AuditLogRowProps): React.ReactNode {
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
		// biome-ignore lint/a11y/useSemanticElements: Table row with button role is intentional for clickable rows pattern
		<tr
			role='button'
			tabIndex={0}
			className={cn(
				'cursor-pointer transition-colors',
				isExpanded ? 'bg-muted/50' : 'hover:bg-muted/30'
			)}
			onClick={onToggle}
			onKeyDown={onKeyDown}
		>
			<td className='px-2 py-3 text-center'>
				<ChevronDownIcon
					className={cn(
						'size-4 text-muted-foreground transition-transform inline-block',
						isExpanded && 'rotate-180'
					)}
				/>
			</td>
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
				<DurationBadge ms={entry.durationMs} />
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
