import { useState, useCallback, useMemo } from 'react'
import {
	Search,
	GripVertical,
	Sparkles,
	GitCommit,
	Timer,
	CheckCircle2,
	User,
	Calendar,
	UserCircle,
	Clock
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useRouteLoaderData } from 'react-router'
import { Input } from '~/shared/ui/shadcn/ui/input.tsx'
import { Badge } from '~/shared/ui/shadcn/ui/badge.tsx'
import { Skeleton } from '~/shared/ui/shadcn/ui/skeleton.tsx'
import { cn } from '~/lib/util/index.ts'
import { formatDateTimeLabel } from '~/shared/lib/formats/format-date-time.ts'
import { useSearchJiraIssuesQuery } from '../api/use-search-jira-issues-query.ts'
import type {
	JiraIssueSearchPanelProps,
	DraggableIssue,
	JiraIssueMatchReason
} from '../model/types.ts'

const ISSUE_REASON_TAG_BASE_CLASS =
	'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium'

const ISSUE_REASON_ORDER: JiraIssueMatchReason[] = ['activity', 'worklog', 'commit', 'search']

const ISSUE_REASON_CONFIG: Record<
	JiraIssueMatchReason,
	{ label: string; icon: LucideIcon; className: string }
> = {
	activity: {
		label: 'Recent activity',
		icon: Sparkles,
		className: 'border-amber-200 bg-amber-100 text-amber-900'
	},
	commit: {
		label: 'Commit mention',
		icon: GitCommit,
		className: 'border-emerald-200 bg-emerald-100 text-emerald-900'
	},
	worklog: {
		label: 'Logged work',
		icon: Timer,
		className: 'border-sky-200 bg-sky-100 text-sky-900'
	},
	search: {
		label: 'Search match',
		icon: Search,
		className: 'border-violet-200 bg-violet-100 text-violet-900'
	}
}

export function JiraIssueSearchPanel({
	userId,
	projectIds,
	relevantIssues = [],
	referencedIssues = [],
	issueKeysInCalendar = new Set(),
	className,
	onIssueDragStart,
	onIssueDragEnd
}: JiraIssueSearchPanelProps): React.ReactNode {
	const [searchText, setSearchText] = useState('')

	const { data: searchResults, isLoading: isSearching } = useSearchJiraIssuesQuery({
		userId,
		projectIds,
		searchText,
		enabled: searchText.trim().length >= 2
	})

	const isSearchActive = searchText.trim().length >= 2
	const defaultIssues = useMemo(() => {
		const combined = [...relevantIssues, ...referencedIssues]

		if (combined.length === 0) {
			return combined
		}

		const deduped = new Map<string, DraggableIssue>()
		for (const issue of combined) {
			const existing = deduped.get(issue.id)
			if (!existing) {
				deduped.set(issue.id, { ...issue, reasons: [...issue.reasons] })
				continue
			}

			const mergedReasons = Array.from(new Set([...existing.reasons, ...issue.reasons]))
			deduped.set(issue.id, { ...existing, reasons: mergedReasons })
		}

		// Sort by created date (descending), then by issue key (ascending) as fallback
		const sorted = Array.from(deduped.values()).sort((a, b) => {
			const aCreated = a.created ? new Date(a.created).getTime() : 0
			const bCreated = b.created ? new Date(b.created).getTime() : 0
			if (aCreated !== bCreated) {
				return bCreated - aCreated // Descending (newest first)
			}
			// Fallback to issue key if createdAt is the same or missing
			return (a.key ?? '').localeCompare(b.key ?? '')
		})

		return sorted
	}, [relevantIssues, referencedIssues])

	const defaultIssueReasonMap = useMemo(() => {
		return new Map(defaultIssues.map(issue => [issue.id, issue.reasons]))
	}, [defaultIssues])

	const searchIssues = useMemo(() => {
		const issues = searchResults?.issues ?? []

		return issues.map(issue => {
			const reasons = new Set<JiraIssueMatchReason>(['search'])
			const additionalReasons = defaultIssueReasonMap.get(issue.id) ?? []

			for (const reason of additionalReasons) {
				reasons.add(reason)
			}

			return {
				id: issue.id,
				key: issue.key,
				summary: issue.fields.summary ?? 'No summary',
				projectKey: issue.fields.project?.key ?? '',
				projectName: issue.fields.project?.name ?? '',
				reasons: Array.from(reasons),
				status: issue.fields.status?.name,
				assignee: issue.fields.assignee?.displayName ?? issue.fields.assignee?.accountId,
				reporter: issue.fields.reporter?.displayName ?? issue.fields.reporter?.accountId,
				created: issue.fields.created,
				updated: issue.fields.updated
			}
		})
	}, [defaultIssueReasonMap, searchResults?.issues])

	return (
		<div className={cn('flex h-full flex-col', className)}>
			{/* Search Input */}
			<div className='border-b p-4'>
				<div className='relative'>
					<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
					<Input
						type='text'
						placeholder='Search issues...'
						value={searchText}
						onChange={e => setSearchText(e.target.value)}
						className='pl-9'
					/>
				</div>
				<p className='mt-2 text-xs text-muted-foreground'>
					Search for issues to drag onto the calendar
				</p>
			</div>

			{/* Results Area */}
			<div className='flex flex-1 flex-col overflow-hidden'>
				{isSearchActive ? (
					<>
						<SectionHeader
							title='Search Results'
							description='Drag issues from the results onto the calendar'
						/>
						<div className='flex-1 overflow-y-auto px-4 pb-4 pt-3'>
							{isSearching ? (
								<SearchLoadingState />
							) : searchIssues.length > 0 ? (
								<IssuesList
									issues={searchIssues}
									issueKeysInCalendar={issueKeysInCalendar}
									onIssueDragStart={onIssueDragStart}
									onIssueDragEnd={onIssueDragEnd}
								/>
							) : (
								<EmptyState message='No issues found matching your search' />
							)}
						</div>
					</>
				) : defaultIssues.length > 0 ? (
					<>
						<SectionHeader
							title='Suggested Issues'
							description='Based on recent worklogs and referenced commits'
						/>
						<div className='flex-1 overflow-y-auto px-4 pb-4 pt-3'>
							<IssuesList
								issues={defaultIssues}
								issueKeysInCalendar={issueKeysInCalendar}
								onIssueDragStart={onIssueDragStart}
								onIssueDragEnd={onIssueDragEnd}
							/>
						</div>
					</>
				) : (
					<div className='flex flex-1 items-center justify-center px-4 pb-4 pt-6'>
						<EmptyState message='No recent issues. Try searching above.' />
					</div>
				)}
			</div>
		</div>
	)
}

interface SectionHeaderProps {
	title: string
	description?: string
}

function SectionHeader({ title, description }: SectionHeaderProps) {
	return (
		<div className='border-b px-4 py-3'>
			<h3 className='text-sm font-semibold text-foreground'>{title}</h3>
			{description ? (
				<p className='text-xs leading-relaxed text-muted-foreground'>{description}</p>
			) : null}
		</div>
	)
}

interface IssuesListProps {
	issues: DraggableIssue[]
	issueKeysInCalendar?: Set<string>
	onIssueDragStart?: (issue: DraggableIssue) => void
	onIssueDragEnd?: () => void
}

function IssuesList({
	issues,
	issueKeysInCalendar = new Set(),
	onIssueDragStart,
	onIssueDragEnd
}: IssuesListProps) {
	return (
		<div className='space-y-2'>
			{issues.map(issue => (
				<DraggableIssueItem
					key={issue.id}
					issue={issue}
					isInCalendar={issueKeysInCalendar.has(issue.key.toUpperCase())}
					onDragStart={onIssueDragStart}
					onDragEnd={onIssueDragEnd}
				/>
			))}
		</div>
	)
}

interface DraggableIssueItemProps {
	issue: DraggableIssue
	isInCalendar?: boolean
	onDragStart?: (issue: DraggableIssue) => void
	onDragEnd?: () => void
}

function DraggableIssueItem({
	issue,
	isInCalendar = false,
	onDragStart,
	onDragEnd
}: DraggableIssueItemProps) {
	const rootData = useRouteLoaderData('root') as { preferences?: { timezone?: string } } | undefined
	const timezone = rootData?.preferences?.timezone ?? 'UTC'

	const handleDragStart = useCallback(
		(e: React.DragEvent<HTMLButtonElement>) => {
			onDragStart?.(issue)

			// Store issue data in drag event
			e.dataTransfer.effectAllowed = 'copy'
			e.dataTransfer.setData('application/json', JSON.stringify(issue))
			e.dataTransfer.setData('text/plain', `${issue.key}: ${issue.summary}`)

			// Add visual feedback
			const target = e.currentTarget
			requestAnimationFrame(() => {
				target.classList.add('opacity-50')
			})
		},
		[issue, onDragStart]
	)

	const handleDragEnd = useCallback(
		(e: React.DragEvent<HTMLButtonElement>) => {
			e.currentTarget.classList.remove('opacity-50')
			onDragEnd?.()
		},
		[onDragEnd]
	)

	return (
		<button
			type='button'
			draggable
			data-issue={JSON.stringify(issue)}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			className={cn(
				'group relative flex w-full cursor-grab flex-col gap-2 rounded-lg border bg-card p-3 text-left transition-all',
				'hover:border-primary/50 hover:bg-accent/50 hover:shadow-sm',
				'active:cursor-grabbing active:scale-[0.98]'
			)}
		>
			{/* Header: Key, Status, Reason, Calendar indicator */}
			<div className='flex items-start justify-between gap-2'>
				<div className='flex min-w-0 flex-1 items-center gap-2'>
					<GripVertical className='h-3.5 w-3.5 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-primary' />
					<Badge
						variant='secondary'
						className='font-mono text-xs font-semibold'
					>
						{issue.key}
					</Badge>
					{issue.status && (
						<Badge
							variant='outline'
							className='text-xs'
						>
							{issue.status}
						</Badge>
					)}
					<IssueReasonTags reasons={issue.reasons} />
				</div>
				{isInCalendar && (
					<CheckCircle2
						className='h-4 w-4 shrink-0 text-primary'
						aria-label='Already in calendar'
					/>
				)}
			</div>

			{/* Summary */}
			<p className='line-clamp-2 text-sm font-medium leading-snug text-foreground'>
				{issue.summary}
			</p>

			{/* Metadata grid */}
			<div className='grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground'>
				{issue.assignee && (
					<div className='flex items-center gap-1.5 truncate'>
						<User className='h-3 w-3 shrink-0' />
						<span className='truncate'>{issue.assignee}</span>
					</div>
				)}
				{issue.reporter && (
					<div className='flex items-center gap-1.5 truncate'>
						<UserCircle className='h-3 w-3 shrink-0' />
						<span className='truncate'>{issue.reporter}</span>
					</div>
				)}
				{issue.created && (
					<div className='flex items-center gap-1.5 truncate'>
						<Calendar className='h-3 w-3 shrink-0' />
						<span className='truncate'>{formatDateTimeLabel(issue.created, timezone)}</span>
					</div>
				)}
				{issue.updated && issue.updated !== issue.created && (
					<div className='flex items-center gap-1.5 truncate'>
						<Clock className='h-3 w-3 shrink-0' />
						<span className='truncate'>{formatDateTimeLabel(issue.updated, timezone)}</span>
					</div>
				)}
			</div>
		</button>
	)
}

function IssueReasonTags({ reasons }: { reasons: DraggableIssue['reasons'] }) {
	if (!reasons || reasons.length === 0) {
		return null
	}

	const uniqueReasons = new Set<JiraIssueMatchReason>(reasons)
	const orderedReasons = ISSUE_REASON_ORDER.filter(reason => uniqueReasons.has(reason))

	if (orderedReasons.length === 0) {
		return null
	}

	// Show only the first reason tag to save space
	const primaryReason = orderedReasons[0]
	if (!primaryReason) {
		return null
	}

	return <IssueReasonTag reason={primaryReason} />
}

function IssueReasonTag({ reason }: { reason: JiraIssueMatchReason }) {
	const config = ISSUE_REASON_CONFIG[reason]
	const Icon = config.icon

	return (
		<span
			className={cn(
				ISSUE_REASON_TAG_BASE_CLASS,
				config.className,
				'px-1.5 py-[3px] flex items-center'
			)}
		>
			<Icon
				aria-hidden
				className='size-3.5'
			/>
		</span>
	)
}

function SearchLoadingState() {
	return (
		<div className='space-y-2'>
			{['a', 'b', 'c', 'd', 'e'].map(skeletonKey => (
				<div
					key={`skeleton-${skeletonKey}`}
					className='flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5'
				>
					<Skeleton className='h-4 w-4 flex-none shrink-0' />
					<div className='min-w-0 flex-1 flex flex-col gap-1.5'>
						<Skeleton className='h-5 w-24' />
						<Skeleton className='h-4 w-full' />
						<Skeleton className='h-3 w-32' />
					</div>
				</div>
			))}
		</div>
	)
}

interface EmptyStateProps {
	message: string
}

function EmptyState({ message }: EmptyStateProps) {
	return (
		<div className='flex flex-col items-center justify-center py-12 text-center'>
			<div className='mb-4 rounded-full bg-muted p-4'>
				<Search className='h-6 w-6 text-muted-foreground' />
			</div>
			<p className='text-sm text-muted-foreground'>{message}</p>
		</div>
	)
}
