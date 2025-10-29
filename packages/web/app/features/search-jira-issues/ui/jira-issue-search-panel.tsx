import { useState, useCallback } from 'react'
import { Search, GripVertical } from 'lucide-react'
import { Input } from '~/shared/ui/shadcn/ui/input.tsx'
import { ScrollArea } from '~/shared/ui/shadcn/ui/scroll-area.tsx'
import { Badge } from '~/shared/ui/shadcn/ui/badge.tsx'
import { Skeleton } from '~/shared/ui/shadcn/ui/skeleton.tsx'
import { cn } from '~/lib/util/index.ts'
import { useSearchJiraIssuesQuery } from '../api/use-search-jira-issues-query.ts'
import type { JiraIssueSearchPanelProps, DraggableIssue } from '../model/types.ts'

export function JiraIssueSearchPanel({
	userId,
	projectIds,
	relevantIssues = [],
	referencedIssues = [],
	className
}: JiraIssueSearchPanelProps): React.ReactNode {
	const [searchText, setSearchText] = useState('')

	const { data: searchResults, isLoading: isSearching } = useSearchJiraIssuesQuery({
		userId,
		projectIds,
		searchText,
		enabled: searchText.trim().length >= 2
	})

	const isSearchActive = searchText.trim().length >= 2

	return (
		<div className={cn('flex flex-col', className)}>
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
			<ScrollArea className='h-[calc(100vh-12rem)] p-4'>
				{isSearchActive ? (
					// Search Results
					isSearching ? (
						<SearchLoadingState />
					) : (searchResults?.issues ?? []).length > 0 ? (
						<IssuesList
							title='Search Results'
							issues={
								searchResults?.issues.map(issue => ({
									id: issue.id,
									key: issue.key,
									summary: issue.fields.summary ?? 'No summary',
									projectKey: issue.fields.project?.key ?? '',
									projectName: issue.fields.project?.name ?? ''
								})) ?? []
							}
						/>
					) : (
						<EmptyState message='No issues found matching your search' />
					)
				) : (
					// Idle State: Show Relevant and Referenced Issues
					<>
						{relevantIssues.length > 0 && (
							<IssuesList
								title='Relevant Issues'
								description='Issues you recently worked on'
								issues={relevantIssues}
							/>
						)}

						{referencedIssues.length > 0 && (
							<IssuesList
								title='Referenced Issues'
								description='Issues from your recent commits'
								issues={referencedIssues}
								className={relevantIssues.length > 0 ? 'mt-6' : ''}
							/>
						)}

						{relevantIssues.length === 0 && referencedIssues.length === 0 && (
							<EmptyState message='No recent issues. Try searching above.' />
						)}
					</>
				)}
			</ScrollArea>
		</div>
	)
}

interface IssuesListProps {
	title: string
	description?: string
	issues: DraggableIssue[]
	className?: string
}

function IssuesList({ title, description, issues, className }: IssuesListProps) {
	return (
		<div className={className}>
			<div className='mb-3 space-y-0.5'>
				<h3 className='text-sm font-semibold text-foreground'>{title}</h3>
				{description && (
					<p className='text-xs text-muted-foreground leading-relaxed'>{description}</p>
				)}
			</div>
			<div className='space-y-2.5'>
				{issues.map(issue => (
					<DraggableIssueItem
						key={issue.id}
						issue={issue}
					/>
				))}
			</div>
		</div>
	)
}

interface DraggableIssueItemProps {
	issue: DraggableIssue
}

function DraggableIssueItem({ issue }: DraggableIssueItemProps) {
	const handleDragStart = useCallback(
		(e: React.DragEvent<HTMLButtonElement>) => {
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
		[issue]
	)

	const handleDragEnd = useCallback((e: React.DragEvent<HTMLButtonElement>) => {
		e.currentTarget.classList.remove('opacity-50')
	}, [])

	return (
		<button
			type='button'
			draggable
			data-issue={JSON.stringify(issue)}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			className={cn(
				'group flex w-full cursor-grab items-start gap-3 rounded-md border bg-card p-3 transition-all text-left',
				'hover:border-primary/50 hover:bg-accent/50 hover:shadow-sm',
				'active:cursor-grabbing active:scale-[0.98]'
			)}
		>
			<GripVertical className='mt-1 h-4 w-4 flex-none text-muted-foreground/60 transition-colors group-hover:text-primary' />

			<div className='min-w-0 flex-1 space-y-1.5'>
				<div className='flex items-start gap-2'>
					<Badge
						variant='secondary'
						className='flex-none text-[11px] font-semibold px-1.5 py-0.5'
					>
						{issue.key}
					</Badge>
				</div>
				<p className='line-clamp-2 text-sm font-medium leading-snug text-foreground'>
					{issue.summary}
				</p>
				{issue.projectName && (
					<p className='text-xs text-muted-foreground/80 truncate'>{issue.projectName}</p>
				)}
			</div>
		</button>
	)
}

function SearchLoadingState() {
	return (
		<div className='space-y-2'>
			{Array.from({ length: 5 }).map((_, i) => (
				<div
					key={`skeleton-${i}`}
					className='flex gap-2 rounded-lg border p-3'
				>
					<Skeleton className='h-4 w-4 flex-none' />
					<div className='min-w-0 flex-1 space-y-2'>
						<Skeleton className='h-4 w-20' />
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
