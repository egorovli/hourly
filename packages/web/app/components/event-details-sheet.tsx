import type { JiraIssueSearchResult } from '~/lib/atlassian/issue.ts'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarIcon, CheckIcon, ClockIcon, LinkIcon, SearchIcon, XIcon } from 'lucide-react'

import { Button } from '~/components/shadcn/ui/button.tsx'
import { Input } from '~/components/shadcn/ui/input.tsx'
import { ScrollArea } from '~/components/shadcn/ui/scroll-area.tsx'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle
} from '~/components/shadcn/ui/sheet.tsx'
import { Skeleton } from '~/components/shadcn/ui/skeleton.tsx'
import { cn } from '~/lib/util/index.ts'

export interface EventDetails {
	id: string
	start: Date
	end: Date
	issueKey?: string
	issueSummary?: string
	isNew: boolean
}

export interface EventDetailsSheetProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	event: EventDetails | undefined
	issues: JiraIssueSearchResult[]
	isLoadingIssues: boolean
	searchQuery: string
	onSearchQueryChange: (query: string) => void
	onSave: (eventId: string, issue: JiraIssueSearchResult) => void
	onCancel: (eventId: string) => void
	isMobile: boolean
}

/**
 * Bottom sheet (mobile) or side sheet (desktop) for editing event details
 * and linking/changing the associated issue.
 */
export function EventDetailsSheet(props: EventDetailsSheetProps): React.ReactNode {
	const {
		open,
		onOpenChange,
		event,
		issues,
		isLoadingIssues,
		searchQuery,
		onSearchQueryChange,
		onSave,
		onCancel,
		isMobile
	} = props

	const [selectedIssue, setSelectedIssue] = useState<JiraIssueSearchResult | undefined>(undefined)
	const [focusedIssueIndex, setFocusedIssueIndex] = useState(-1)
	const searchInputRef = useRef<HTMLInputElement>(null)
	const issueListRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (event?.issueKey) {
			const matchingIssue = issues.find(i => i.key === event.issueKey)
			setSelectedIssue(matchingIssue)
		} else {
			setSelectedIssue(undefined)
		}
	}, [event?.issueKey, issues])

	// Auto-focus search input when sheet opens
	useEffect(() => {
		if (open) {
			const timer = setTimeout(() => searchInputRef.current?.focus(), 100)
			return () => clearTimeout(timer)
		}
		// Reset focused index when sheet closes
		setFocusedIssueIndex(-1)
		return undefined
	}, [open])

	// Reset focused index when issues change (intentionally depends on issues.length)
	// biome-ignore lint/correctness/useExhaustiveDependencies: we want to reset when issues change
	useEffect(() => {
		setFocusedIssueIndex(-1)
	}, [issues.length])

	const handleSave = useCallback(() => {
		if (event && selectedIssue) {
			onSave(event.id, selectedIssue)
			onOpenChange(false)
		}
	}, [event, selectedIssue, onSave, onOpenChange])

	const handleCancel = useCallback(() => {
		if (event) {
			onCancel(event.id)
		}
		onOpenChange(false)
	}, [event, onCancel, onOpenChange])

	const handleIssueSelect = useCallback((issue: JiraIssueSearchResult) => {
		setSelectedIssue(issue)
	}, [])

	// Keyboard navigation for search input and issue list
	const handleSearchKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'ArrowDown') {
				e.preventDefault()
				if (issues.length > 0) {
					setFocusedIssueIndex(0)
					// Focus the first issue button
					const firstButton = issueListRef.current?.querySelector('button')
					firstButton?.focus()
				}
			}
		},
		[issues.length]
	)

	const handleIssueKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLButtonElement>, index: number, issue: JiraIssueSearchResult) => {
			switch (e.key) {
				case 'ArrowDown': {
					e.preventDefault()
					if (index < issues.length - 1) {
						setFocusedIssueIndex(index + 1)
						const buttons = issueListRef.current?.querySelectorAll('button')
						buttons?.[index + 1]?.focus()
					}
					break
				}
				case 'ArrowUp': {
					e.preventDefault()
					if (index > 0) {
						setFocusedIssueIndex(index - 1)
						const buttons = issueListRef.current?.querySelectorAll('button')
						buttons?.[index - 1]?.focus()
					} else {
						// Return focus to search input
						setFocusedIssueIndex(-1)
						searchInputRef.current?.focus()
					}
					break
				}
				case 'Enter':
				case ' ': {
					e.preventDefault()
					handleIssueSelect(issue)
					break
				}
			}
		},
		[issues.length, handleIssueSelect]
	)

	const timeDisplay = useMemo(() => {
		if (!event) {
			return ''
		}

		const startTime = event.start.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		})
		const endTime = event.end.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		})

		return `${startTime} – ${endTime}`
	}, [event])

	const dateDisplay = useMemo(() => {
		if (!event) {
			return ''
		}

		return event.start.toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		})
	}, [event])

	const durationDisplay = useMemo(() => {
		if (!event) {
			return ''
		}

		const durationMs = event.end.getTime() - event.start.getTime()
		const hours = Math.floor(durationMs / (1000 * 60 * 60))
		const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))

		if (hours === 0) {
			return `${minutes}m`
		}
		if (minutes === 0) {
			return `${hours}h`
		}
		return `${hours}h ${minutes}m`
	}, [event])

	const canSave = selectedIssue !== undefined

	return (
		<Sheet
			open={open}
			onOpenChange={onOpenChange}
		>
			<SheetContent
				side={isMobile ? 'bottom' : 'right'}
				className={cn(
					isMobile && 'h-[85vh] max-h-[85vh] rounded-t-2xl',
					!isMobile && 'w-full sm:max-w-md'
				)}
			>
				<SheetHeader>
					<SheetTitle>{event?.isNew ? 'Create Worklog' : 'Edit Worklog'}</SheetTitle>
					<SheetDescription>
						{event?.isNew
							? 'Select an issue to link this time entry to.'
							: 'Change the linked issue for this time entry.'}
					</SheetDescription>
				</SheetHeader>

				<div className='flex flex-col gap-4 flex-1 overflow-hidden px-4'>
					<div className='flex flex-wrap gap-3'>
						<div className='flex items-center gap-2 text-sm text-muted-foreground'>
							<CalendarIcon className='size-4' />
							<span>{dateDisplay}</span>
						</div>
						<div className='flex items-center gap-2 text-sm text-muted-foreground'>
							<ClockIcon className='size-4' />
							<span>{timeDisplay}</span>
							<span className='text-xs bg-muted px-1.5 py-0.5 rounded'>{durationDisplay}</span>
						</div>
					</div>

					{selectedIssue && (
						<div className='flex items-center gap-2 p-3 rounded-lg border bg-primary/5 border-primary/20'>
							<LinkIcon className='size-4 text-primary shrink-0' />
							<div className='flex-1 min-w-0'>
								<div className='flex items-center gap-2'>
									<span className='font-medium text-primary text-sm'>{selectedIssue.key}</span>
								</div>
								<p className='text-sm text-muted-foreground truncate'>
									{selectedIssue.fields.summary}
								</p>
							</div>
							<Button
								variant='ghost'
								size='icon-sm'
								className='shrink-0'
								onClick={() => {
									setSelectedIssue(undefined)
								}}
							>
								<XIcon className='size-4' />
							</Button>
						</div>
					)}

					<div className='relative'>
						<SearchIcon className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
						<Input
							ref={searchInputRef}
							type='search'
							placeholder='Search issues by key or text...'
							className='pl-9 pr-9 h-11'
							value={searchQuery}
							onChange={e => {
								onSearchQueryChange(e.target.value)
							}}
							onKeyDown={handleSearchKeyDown}
						/>
						{searchQuery.length > 0 && (
							<Button
								type='button'
								variant='ghost'
								size='icon-sm'
								className='absolute right-2 top-1/2 size-6 -translate-y-1/2'
								onClick={() => onSearchQueryChange('')}
							>
								<XIcon className='size-3.5' />
							</Button>
						)}
					</div>

					<ScrollArea className='flex-1 -mx-4 px-4'>
						<div
							ref={issueListRef}
							className='flex flex-col gap-1 pb-4'
						>
							{isLoadingIssues ? (
								<>
									<IssueItemSkeleton />
									<IssueItemSkeleton />
									<IssueItemSkeleton />
									<IssueItemSkeleton />
								</>
							) : issues.length === 0 ? (
								<div className='flex flex-col items-center justify-center py-8 text-center'>
									<SearchIcon className='size-8 text-muted-foreground/50 mb-2' />
									<p className='text-sm text-muted-foreground'>
										{searchQuery.length > 0
											? 'No issues found matching your search.'
											: 'No issues available. Check your project and user filters.'}
									</p>
								</div>
							) : (
								issues.map((issue, index) => {
									return (
										<IssueListItem
											key={issue.id}
											issue={issue}
											isSelected={selectedIssue?.key === issue.key}
											isFocused={focusedIssueIndex === index}
											onSelect={handleIssueSelect}
											onKeyDown={e => handleIssueKeyDown(e, index, issue)}
										/>
									)
								})
							)}
						</div>
					</ScrollArea>
				</div>

				<SheetFooter className='border-t pt-4'>
					<div className='flex gap-2 w-full'>
						<Button
							variant='outline'
							className='flex-1'
							onClick={handleCancel}
						>
							{event?.isNew ? 'Cancel' : 'Close'}
						</Button>
						<Button
							className='flex-1'
							disabled={!canSave}
							onClick={handleSave}
						>
							{event?.isNew ? 'Create' : 'Update'}
						</Button>
					</div>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	)
}

interface IssueListItemProps {
	issue: JiraIssueSearchResult
	isSelected: boolean
	isFocused: boolean
	onSelect: (issue: JiraIssueSearchResult) => void
	onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void
}

function IssueListItem({
	issue,
	isSelected,
	isFocused,
	onSelect,
	onKeyDown
}: IssueListItemProps): React.ReactNode {
	return (
		<button
			type='button'
			className={cn(
				'flex items-start gap-3 p-3 rounded-lg text-left transition-colors',
				'min-h-[56px] touch-manipulation',
				'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
				isSelected
					? 'bg-primary/10 border border-primary/30'
					: isFocused
						? 'bg-muted/70 border border-muted-foreground/20'
						: 'hover:bg-muted/50 border border-transparent'
			)}
			onClick={() => {
				onSelect(issue)
			}}
			onKeyDown={onKeyDown}
		>
			{issue.fields.issuetype?.iconUrl && (
				<img
					src={issue.fields.issuetype.iconUrl}
					alt={issue.fields.issuetype.name ?? 'Issue'}
					className='size-4 mt-0.5 shrink-0'
				/>
			)}

			<div className='flex-1 min-w-0'>
				<div className='flex items-center gap-2'>
					<span className={cn('font-medium text-sm', isSelected && 'text-primary')}>
						{issue.key}
					</span>
					{issue.fields.status && (
						<span className='text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded'>
							{issue.fields.status.name}
						</span>
					)}
				</div>
				<p className='text-sm text-muted-foreground line-clamp-2'>{issue.fields.summary}</p>
			</div>

			{isSelected && (
				<div className='size-5 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5'>
					<CheckIcon className='size-3 text-primary-foreground' />
				</div>
			)}
		</button>
	)
}

function IssueItemSkeleton(): React.ReactNode {
	return (
		<div className='flex items-start gap-3 p-3'>
			<Skeleton className='size-4 rounded shrink-0' />
			<div className='flex-1 space-y-2'>
				<div className='flex items-center gap-2'>
					<Skeleton className='h-4 w-16' />
					<Skeleton className='h-4 w-12' />
				</div>
				<Skeleton className='h-4 w-full' />
			</div>
		</div>
	)
}
