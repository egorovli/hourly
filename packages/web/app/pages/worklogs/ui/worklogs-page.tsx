import type { WorklogCalendarEvent } from '~/entities/index.ts'
import type { CalendarProps } from 'react-big-calendar'
import type { WorklogsPageProps } from '../model/types.ts'

import { useWorklogsPageState } from '../model/use-worklogs-page-state.ts'

import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BugIcon, CalendarDays, ChevronDown, GitBranch, Calendar } from 'lucide-react'
import { Views } from 'react-big-calendar'

import { Badge } from '~/shared/ui/shadcn/ui/badge.tsx'
import { Button } from '~/shared/ui/shadcn/ui/button.tsx'
import { Skeleton } from '~/shared/ui/shadcn/ui/skeleton.tsx'
import { Spinner } from '~/shared/ui/shadcn/ui/spinner.tsx'
import { AutoLoadProgress } from '~/shared/index.ts'
import type { WorklogDataStatus } from '~/widgets/worklogs-calendar/index.ts'
import {
	WorklogCalendarStats,
	WorklogsCalendar,
	aggregateWorklogStats
} from '~/widgets/worklogs-calendar/index.ts'
import { invariant } from '~/lib/util/index.ts'

import { DateRangeFilter } from '~/features/select-date-range/index.ts'

// FSD shared layer imports
import {
	ErrorPlaceholder,
	formatDurationFromSeconds,
	getErrorMessage,
	generateColorFromString
} from '~/shared/index.ts'

// FSD manage-worklogs feature
import { WorklogChangesActions, WorklogChangesSummary } from '~/features/manage-worklogs/index.ts'
import { useUpdateCalendarCompactMode } from '~/features/update-calendar-compact-mode/index.ts'

// FSD widgets
import { FiltersPanel, FilterDependencyMessage } from '~/widgets/filters-panel/index.ts'
import { JiraIssueSearchPanel } from '~/features/search-jira-issues/index.ts'
import type { DraggableIssue } from '~/features/search-jira-issues/index.ts'
import {
	WorklogEntryDebugCard,
	RelevantIssueDebugCard,
	GitlabCommitDebugCard
} from '~/widgets/debug-panel/index.ts'

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
const FORMATS: CalendarProps<WorklogCalendarEvent>['formats'] = {
	dayFormat: 'EEE, MMM d',
	timeGutterFormat: 'HH:mm'
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex conditional rendering for UX states
export function WorklogsPage({ loaderData }: WorklogsPageProps): React.ReactNode {
	invariant(loaderData.user?.atlassian?.id, 'Atlassian profile ID is required in loader data')
	invariant(loaderData.user?.gitlab?.id, 'GitLab profile ID is required in loader data')

	const {
		// preferences
		workingDayStartTime,
		workingDayEndTime,
		calendarCompactMode,
		localizer,
		// feature state
		state,
		dispatch,
		// queries
		projectsQuery,
		usersQuery,
		worklogEntriesQuery,
		jiraIssuesQuery,
		gitlabProjectsQuery,
		gitlabContributorsQuery,
		gitlabCommitsQuery,
		commitIssuesFromGitlabQuery,
		// autos
		worklogAutoLoad,
		jiraIssuesAutoLoad,
		gitlabCommitsAutoLoad,
		commitIssuesAutoLoad,
		// derived flags
		hasJiraProjectsSelected,
		hasGitlabProjectsSelected,
		hasCompleteDateRange,
		canLoadWorklogs,
		canLoadRelevantIssues,
		canLoadGitlabCommits,
		// derived data
		worklogChanges,
		worklogDebugEntries,
		relevantIssueDebugEntries,
		gitlabCommitsDebugEntries,
		commitIssueDebugEntries,
		totalWorklogEntries,
		totalRelevantIssues,
		totalGitlabCommits,
		totalCommitReferencedIssues,
		// calendar
		calendarView,
		setCalendarView,
		calendarDate,
		setCalendarDate,
		calendarEvents,
		calendarEventPropGetter,
		calendarDayPropGetter,
		calendarSlotPropGetter,
		calendarBusinessHours,
		// handlers
		handleJiraProjectIdsChange,
		handleJiraUserIdsChange,
		handleDateRangeChange,
		handleGitlabProjectIdsChange,
		handleGitlabContributorIdsChange,
		handleCalendarViewDateRangeChange,
		handleControlledCalendarViewChange,
		handleControlledCalendarNavigate,
		handleControlledCalendarRangeChange,
		handleApplyWorklogsFromCommits,
		canApplyWorklogsFromCommits
	} = useWorklogsPageState(loaderData)

	const [isDebugOpen, setIsDebugOpen] = useState(false)
	const isDebugPresetAvailable = import.meta.env.DEV

	const [draggedIssue, setDraggedIssue] = useState<DraggableIssue | null>(null)
	const [calendarStatsEvents, setCalendarStatsEvents] =
		useState<WorklogCalendarEvent[]>(calendarEvents)
	const [isInsightsOpen, setIsInsightsOpen] = useState(false)

	useEffect(() => {
		setCalendarStatsEvents(calendarEvents)
	}, [calendarEvents])

	const calendarStatsSummary = useMemo(
		() => aggregateWorklogStats(calendarStatsEvents),
		[calendarStatsEvents]
	)

	// Track issue keys from calendar events (including local changes)
	const issueKeysInCalendar = useMemo(() => {
		const keys = new Set<string>()
		for (const event of calendarStatsEvents) {
			if (event.resource.issueKey) {
				keys.add(event.resource.issueKey.toUpperCase())
			}
		}
		return keys
	}, [calendarStatsEvents])

	const issueKeysWithWorklogs = useMemo(() => {
		if (worklogDebugEntries.length === 0) {
			return new Set<string>()
		}

		return new Set(
			worklogDebugEntries
				.map(entry => entry.issueKey?.toUpperCase())
				.filter((issueKey): issueKey is string => Boolean(issueKey))
		)
	}, [worklogDebugEntries])

	const insightStatuses = useMemo<WorklogDataStatus[]>(() => {
		return [
			{
				label: 'Worklogs',
				isLoading:
					worklogEntriesQuery.isLoading ||
					worklogEntriesQuery.isFetching ||
					worklogAutoLoad.isAutoLoading,
				loaded: worklogDebugEntries.length,
				total: totalWorklogEntries
			},
			{
				label: 'Issues',
				isLoading:
					jiraIssuesQuery.isLoading ||
					jiraIssuesQuery.isFetching ||
					jiraIssuesAutoLoad.isAutoLoading,
				loaded: relevantIssueDebugEntries.length,
				total: totalRelevantIssues
			},
			{
				label: 'Commits',
				isLoading:
					gitlabCommitsQuery.isLoading ||
					gitlabCommitsQuery.isFetching ||
					gitlabCommitsAutoLoad.isAutoLoading,
				loaded: gitlabCommitsDebugEntries.length,
				total: totalGitlabCommits
			}
		]
	}, [
		gitlabCommitsAutoLoad.isAutoLoading,
		gitlabCommitsDebugEntries.length,
		gitlabCommitsQuery.isFetching,
		gitlabCommitsQuery.isLoading,
		jiraIssuesAutoLoad.isAutoLoading,
		jiraIssuesQuery.isFetching,
		jiraIssuesQuery.isLoading,
		relevantIssueDebugEntries.length,
		totalGitlabCommits,
		totalRelevantIssues,
		totalWorklogEntries,
		worklogAutoLoad.isAutoLoading,
		worklogDebugEntries.length,
		worklogEntriesQuery.isFetching,
		worklogEntriesQuery.isLoading
	])

	// Calendar compact mode mutation
	const compactModeMutation = useUpdateCalendarCompactMode()

	const handleCompactModeChange = useCallback(
		(mode: typeof calendarCompactMode) => {
			compactModeMutation.mutate({ calendarCompactMode: mode })
		},
		[compactModeMutation]
	)

	const handleIssueDragStart = useCallback((issue: DraggableIssue) => {
		setDraggedIssue(issue)
	}, [])

	const handleIssueDragEnd = useCallback(() => {
		setDraggedIssue(null)
	}, [])

	const handleApplyDebugPreset = useCallback(() => {
		if (!isDebugPresetAvailable) {
			return
		}

		const preset = {
			jiraProjectIds: ['10718'],
			jiraUserIds: ['6242e240699649006ae56ef4'],
			gitlabProjectIds: ['59014094'],
			gitlabContributorIds: ['a.egorov@health-samurai.io', 'anton.egorov@health-samurai.io'],
			dateRange: {
				from: new Date(2025, 8, 1),
				to: new Date(2025, 8, 30)
			}
		} as const
		const presetFrom = new Date(preset.dateRange.from.getTime())
		const presetTo = new Date(preset.dateRange.to.getTime())

		handleJiraProjectIdsChange([...preset.jiraProjectIds])
		handleJiraUserIdsChange([...preset.jiraUserIds])
		handleGitlabProjectIdsChange([...preset.gitlabProjectIds])
		handleGitlabContributorIdsChange([...preset.gitlabContributorIds])
		handleDateRangeChange({
			from: presetFrom,
			to: presetTo
		})
		handleCalendarViewDateRangeChange({
			from: new Date(presetFrom.getTime()),
			to: new Date(presetTo.getTime())
		})

		setCalendarView(Views.WEEK)
		setCalendarDate(presetFrom)
	}, [
		handleCalendarViewDateRangeChange,
		handleDateRangeChange,
		handleGitlabContributorIdsChange,
		handleGitlabProjectIdsChange,
		handleJiraProjectIdsChange,
		handleJiraUserIdsChange,
		setCalendarDate,
		setCalendarView
	])

	const handleSetCurrentMonth = useCallback(() => {
		const now = new Date()
		const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
		const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

		handleDateRangeChange({
			from: firstDay,
			to: lastDay
		})
		handleCalendarViewDateRangeChange({
			from: new Date(firstDay.getTime()),
			to: new Date(lastDay.getTime())
		})

		setCalendarView(Views.WEEK)
		setCalendarDate(firstDay)
	}, [handleCalendarViewDateRangeChange, handleDateRangeChange, setCalendarDate, setCalendarView])

	const handleIssueDropOnCalendar = useCallback(
		(args: {
			start: Date
			end: Date
			allDay: boolean
			issue: {
				id: string
				key: string
				summary: string
				projectKey: string
				projectName: string
			} | null
		}) => {
			// Clear dragged issue state - the calendar component handles worklog creation
			setDraggedIssue(null)
		},
		[]
	)

	const handleWorklogDelete = useCallback(
		(localId: string) => {
			dispatch({ type: 'worklog.delete', payload: localId })
		},
		[dispatch]
	)

	const handleWorklogApply = useCallback(() => {
		dispatch({ type: 'worklog.apply' })
	}, [dispatch])

	const handleWorklogRevert = useCallback(() => {
		dispatch({ type: 'worklog.revert' })
	}, [dispatch])

	const isAnyQueryLoading =
		projectsQuery.isLoading ||
		usersQuery.isLoading ||
		worklogEntriesQuery.isLoading ||
		jiraIssuesQuery.isLoading ||
		gitlabProjectsQuery.isLoading ||
		gitlabContributorsQuery.isLoading ||
		gitlabCommitsQuery.isLoading ||
		commitIssuesFromGitlabQuery.isLoading ||
		worklogAutoLoad.isAutoLoading ||
		jiraIssuesAutoLoad.isAutoLoading ||
		gitlabCommitsAutoLoad.isAutoLoading ||
		commitIssuesAutoLoad.isAutoLoading

	// Flatten projects data for calendar component
	const projectsData = useMemo(() => {
		if (!projectsQuery.data?.byResource) {
			return []
		}
		// Extract all projects from byResource map and flatten into single array
		return Object.values(projectsQuery.data.byResource).flat()
	}, [projectsQuery.data?.byResource])

	const searchPanelRelevantIssues = useMemo(() => {
		return (
			jiraIssuesQuery.data?.pages
				.flatMap(page => page.issues)
				.slice(0, 10)
				.map(issue => {
					const normalizedKey = issue.key?.toUpperCase()
					const reasons: DraggableIssue['reasons'] = ['activity']

					if (normalizedKey && issueKeysWithWorklogs.has(normalizedKey)) {
						reasons.push('worklog')
					}

					return {
						id: issue.id,
						key: issue.key,
						summary: issue.fields.summary ?? 'No summary',
						projectKey: issue.fields.project?.key ?? '',
						projectName: issue.fields.project?.name ?? '',
						reasons
					}
				}) ?? []
		)
	}, [issueKeysWithWorklogs, jiraIssuesQuery.data?.pages])

	const searchPanelReferencedIssues = useMemo(() => {
		const allIssues = commitIssuesFromGitlabQuery.data?.pages.flatMap(page => page.issues) ?? []

		if (allIssues.length === 0) {
			return []
		}

		// Sort by createdAt (descending), then by issue key (ascending) as fallback
		const sortedIssues = allIssues
			.slice()
			.sort((a, b) => {
				const aCreated = a.fields.created ? new Date(a.fields.created).getTime() : 0
				const bCreated = b.fields.created ? new Date(b.fields.created).getTime() : 0
				if (aCreated !== bCreated) {
					return bCreated - aCreated // Descending (newest first)
				}
				// Fallback to issue key if createdAt is the same or missing
				return (a.key ?? '').localeCompare(b.key ?? '')
			})
			.slice(0, 10)
			.map(issue => {
				const normalizedKey = issue.key?.toUpperCase()
				const reasons: DraggableIssue['reasons'] = ['commit']

				if (normalizedKey && issueKeysWithWorklogs.has(normalizedKey)) {
					reasons.push('worklog')
				}

				return {
					id: issue.id,
					key: issue.key,
					summary: issue.fields.summary ?? 'No summary',
					projectKey: issue.fields.project?.key ?? '',
					projectName: issue.fields.project?.name ?? '',
					reasons
				}
			})

		return sortedIssues
	}, [commitIssuesFromGitlabQuery.data?.pages, issueKeysWithWorklogs])

	return (
		<div className='flex flex-col gap-6 grow bg-background'>
			{/* Subtle loading indicator */}
			{isAnyQueryLoading && (
				<div className='fixed top-0 left-0 right-0 z-50 h-0.5 bg-primary/20'>
					<div className='h-full bg-primary animate-pulse' />
				</div>
			)}

			<div className='flex flex-col gap-6'>
				<div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
					<div className='flex flex-col gap-1'>
						<h1 className='text-3xl font-bold'>Worklogs</h1>
						<p className='text-sm text-muted-foreground'>
							Apply filters to view and manage Jira worklogs
						</p>
					</div>
					<div className='flex items-center gap-2'>
						<Button
							type='button'
							variant='outline'
							size='sm'
							onClick={handleSetCurrentMonth}
						>
							<Calendar className='h-3 w-3' />
							This Month
						</Button>
						{isDebugPresetAvailable ? (
							<Button
								type='button'
								variant='outline'
								size='sm'
								onClick={handleApplyDebugPreset}
							>
								<BugIcon className='h-3 w-3' />
								Debug
							</Button>
						) : null}
					</div>
				</div>

				<FiltersPanel
					dateRange={state.dateRange}
					onDateRangeChange={handleDateRangeChange}
					jiraProjectsQuery={projectsQuery}
					selectedJiraProjectIds={state.selectedJiraProjectIds}
					onJiraProjectIdsChange={handleJiraProjectIdsChange}
					jiraUsersQuery={usersQuery}
					selectedJiraUserIds={state.selectedJiraUserIds}
					onJiraUserIdsChange={handleJiraUserIdsChange}
					gitlabProjectsQuery={gitlabProjectsQuery}
					selectedGitlabProjectIds={state.selectedGitlabProjectIds}
					onGitlabProjectIdsChange={handleGitlabProjectIdsChange}
					gitlabContributorsQuery={gitlabContributorsQuery}
					selectedGitlabContributorIds={state.selectedGitlabContributorIds}
					onGitlabContributorIdsChange={handleGitlabContributorIdsChange}
					hasJiraProjectsSelected={hasJiraProjectsSelected}
					hasGitlabProjectsSelected={hasGitlabProjectsSelected}
					hasCompleteDateRange={hasCompleteDateRange}
				/>

				{canApplyWorklogsFromCommits ? (
					<div className='flex flex-col gap-2 rounded-lg border bg-card p-4'>
						<div className='flex items-start justify-between gap-4'>
							<div className='flex flex-col gap-1'>
								<div className='flex items-center gap-2'>
									<GitBranch className='h-4 w-4 text-muted-foreground' />
									<h3 className='text-sm font-semibold'>Auto-generate worklogs from commits</h3>
								</div>
								<p className='text-xs text-muted-foreground'>
									Automatically create worklog entries based on commits that reference Jira issues.
									Worklogs are split by day and distributed across issues worked on each day,
									respecting your work hours ({workingDayStartTime}–{workingDayEndTime}) and minimum
									duration ({loaderData.preferences?.minimumDurationMinutes ?? 60} min).
								</p>
								<p className='mt-1 text-xs text-muted-foreground'>
									{gitlabCommitsDebugEntries.length} commit
									{gitlabCommitsDebugEntries.length === 1 ? '' : 's'} found •{' '}
									{totalCommitReferencedIssues} issue{totalCommitReferencedIssues === 1 ? '' : 's'}{' '}
									referenced
								</p>
							</div>
							<Button
								type='button'
								variant='default'
								size='sm'
								onClick={handleApplyWorklogsFromCommits}
								disabled={
									gitlabCommitsAutoLoad.isAutoLoading ||
									commitIssuesAutoLoad.isAutoLoading ||
									!canApplyWorklogsFromCommits
								}
							>
								<GitBranch className='mr-2 h-4 w-4' />
								Apply from Commits
							</Button>
						</div>
					</div>
				) : null}
			</div>

			{/* Main calendar view */}
			<div className='flex flex-col gap-4 grow'>
				{canLoadWorklogs ? (
					<>
						{worklogDebugEntries.length > 0 ? (
							<div className='flex flex-col gap-4'>
								<div className='flex items-center justify-between'>
									<div className='flex flex-col gap-1'>
										<h2 className='text-xl font-semibold'>Worklog Calendar</h2>
										<p className='text-sm text-muted-foreground'>
											Showing {worklogDebugEntries.length} worklog{' '}
											{worklogDebugEntries.length === 1 ? 'entry' : 'entries'}
										</p>
									</div>
									<AutoLoadProgress
										isLoading={worklogAutoLoad.isAutoLoading}
										pagesLoaded={worklogAutoLoad.pagesLoaded}
										totalPages={worklogAutoLoad.totalPages}
										progressPercent={worklogAutoLoad.progressPercent}
									/>
								</div>
								{(() => {
									const uniqueProjects = Array.from(
										new Set(worklogDebugEntries.map(e => e.projectName))
									).sort()

									if (uniqueProjects.length <= 2) {
										return null
									}

									return (
										<div className='flex flex-wrap items-center gap-3 pb-3 border-b'>
											<span className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
												Projects:
											</span>
											{uniqueProjects.map(projectName => {
												const colors = generateColorFromString(projectName)
												return (
													<div
														key={projectName}
														className='flex items-center gap-1.5 text-xs'
													>
														<div
															className='w-3 h-3 rounded-sm border'
															style={{
																backgroundColor: colors.backgroundColor,
																borderColor: colors.borderColor
															}}
														/>
														<span className='font-medium text-foreground'>{projectName}</span>
													</div>
												)
											})}
										</div>
									)
								})()}
							</div>
						) : null}
						<div className='flex gap-6 grow h-[calc(100vh-12rem)] min-h-[calc(100vh-12rem)] overflow-hidden'>
							<div className='w-80 rounded-lg border bg-card shadow-sm shrink-0 flex flex-col h-full'>
								<JiraIssueSearchPanel
									userId={loaderData.user.atlassian.id}
									projectIds={state.selectedJiraProjectIds}
									relevantIssues={searchPanelRelevantIssues}
									referencedIssues={searchPanelReferencedIssues}
									issueKeysInCalendar={issueKeysInCalendar}
									onIssueDragStart={handleIssueDragStart}
									onIssueDragEnd={handleIssueDragEnd}
								/>
							</div>
							<div className='flex-1 rounded-lg border bg-card shadow-sm overflow-hidden flex flex-col'>
								{worklogEntriesQuery.status === 'pending' ? (
									<div className='flex flex-col items-center justify-center gap-4 h-full text-center'>
										<div className='h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin' />
										<h2 className='text-xl font-semibold text-foreground'>Loading worklogs...</h2>
										<p className='text-sm text-muted-foreground'>
											Fetching {totalWorklogEntries > 0 ? `${totalWorklogEntries} ` : ''}worklog
											entries
										</p>
									</div>
								) : worklogEntriesQuery.status === 'error' ? (
									<div className='flex flex-col items-center justify-center gap-4 h-full text-center'>
										<div className='h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center'>
											<span className='text-2xl text-destructive'>✕</span>
										</div>
										<h2 className='text-xl font-semibold text-foreground'>
											Failed to load worklogs
										</h2>
										<p className='text-sm text-muted-foreground max-w-md'>
											{getErrorMessage(worklogEntriesQuery.error)}
										</p>
									</div>
								) : worklogDebugEntries.length === 0 ? (
									<div className='flex flex-col items-center justify-center gap-4 h-full text-center'>
										<div className='h-16 w-16 rounded-full bg-muted flex items-center justify-center'>
											<CalendarDays className='h-8 w-8 text-muted-foreground' />
										</div>
										<h2 className='text-xl font-semibold text-foreground'>No worklogs found</h2>
										<p className='text-sm text-muted-foreground max-w-md'>
											No worklog entries match your current filters. Try adjusting the date range or
											selected users, or drag issues from the panel to create worklogs.
										</p>
									</div>
								) : (
									<WorklogsCalendar
										date={calendarDate}
										view={calendarView}
										localizer={localizer}
										events={calendarEvents}
										formats={FORMATS}
										min={calendarBusinessHours.start}
										max={calendarBusinessHours.end}
										onView={handleControlledCalendarViewChange}
										onNavigate={handleControlledCalendarNavigate}
										onRangeChange={handleControlledCalendarRangeChange}
										eventPropGetter={calendarEventPropGetter}
										dayPropGetter={calendarDayPropGetter}
										slotPropGetter={calendarSlotPropGetter}
										compactMode={calendarCompactMode}
										onCompactModeChange={handleCompactModeChange}
										currentUserAccountId={loaderData.user?.atlassian?.id}
										currentUserName={
											usersQuery.data?.users.find(
												u => u.accountId === loaderData.user?.atlassian?.id
											)?.displayName ?? 'Current User'
										}
										selectedProjectIds={state.selectedJiraProjectIds}
										projectsData={projectsData}
										workingDayStartTime={workingDayStartTime}
										workingDayEndTime={workingDayEndTime}
										onDropFromOutside={handleIssueDropOnCalendar}
										externalIssue={draggedIssue}
										onLocalEventsChange={setCalendarStatsEvents}
									/>
								)}
							</div>
						</div>
					</>
				) : (
					<div className='flex flex-col items-center justify-center gap-4 py-24 text-center'>
						<CalendarDays className='h-16 w-16 text-muted-foreground/40' />
						<h2 className='text-xl font-semibold text-foreground'>No filters selected</h2>
						<p className='text-sm text-muted-foreground max-w-md'>
							Select Jira projects, users, and a date range above to load and visualize your worklog
							entries on the calendar.
						</p>
					</div>
				)}
			</div>

			<CollapsibleSection
				title='Worklog Insights'
				description='Analytics for the currently loaded worklogs'
				open={isInsightsOpen}
				onOpenChange={setIsInsightsOpen}
				meta={
					calendarStatsSummary.totalEntries > 0 ? (
						<div className='flex flex-wrap items-center gap-2'>
							<Badge
								variant='secondary'
								className='rounded-sm px-2 text-[11px] uppercase'
							>
								{calendarStatsSummary.totalEntries} entries
							</Badge>
							<Badge
								variant='outline'
								className='rounded-sm px-2 text-[11px] uppercase'
							>
								{formatDurationFromSeconds(calendarStatsSummary.totalSeconds)}
							</Badge>
						</div>
					) : null
				}
			>
				{calendarStatsSummary.totalEntries > 0 ? (
					<WorklogCalendarStats
						events={calendarStatsEvents}
						statuses={insightStatuses}
					/>
				) : (
					<div className='border-border/60 bg-muted/40 text-xs text-muted-foreground flex items-center gap-2 rounded-lg border px-3 py-2'>
						{insightStatuses.some(status => status.isLoading) ? (
							<Spinner className='size-3' />
						) : null}
						<span>
							{insightStatuses.some(status => status.isLoading)
								? 'Fetching worklogs…'
								: 'No worklog data yet for the current filters.'}
						</span>
					</div>
				)}
			</CollapsibleSection>

			{/* Collapsible debug panels */}
			<CollapsibleSection
				title='Debug Data'
				description='View detailed data from all queries'
				open={isDebugOpen}
				onOpenChange={setIsDebugOpen}
				meta={
					<div className='flex flex-wrap items-center gap-2'>
						{totalWorklogEntries > 0 ? (
							<Badge
								variant='secondary'
								className='rounded-sm'
							>
								{totalWorklogEntries} worklogs
							</Badge>
						) : null}
						{totalRelevantIssues > 0 ? (
							<Badge
								variant='secondary'
								className='rounded-sm'
							>
								{totalRelevantIssues} issues
							</Badge>
						) : null}
						{totalGitlabCommits > 0 ? (
							<Badge
								variant='secondary'
								className='rounded-sm'
							>
								{totalGitlabCommits} commits
							</Badge>
						) : null}
					</div>
				}
			>
				<div className='flex flex-col gap-6'>
					<div className='grid gap-6 xl:grid-cols-2'>
						<section className='flex flex-col gap-3 rounded-lg border bg-card/30 p-4 shadow-sm'>
							<div className='flex items-center justify-between gap-2'>
								<div className='flex flex-col gap-1'>
									<p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
										Jira worklog entries
									</p>
									<p className='text-xs text-muted-foreground'>
										Loaded {worklogDebugEntries.length} of {totalWorklogEntries} worklogs
									</p>
									<AutoLoadProgress
										isLoading={worklogAutoLoad.isAutoLoading}
										pagesLoaded={worklogAutoLoad.pagesLoaded}
										totalPages={worklogAutoLoad.totalPages}
										progressPercent={worklogAutoLoad.progressPercent}
									/>
								</div>
								{totalWorklogEntries > 0 ? (
									<Badge
										variant='secondary'
										className='rounded-sm px-2 text-[11px] font-semibold uppercase tracking-wide'
									>
										{totalWorklogEntries} logs
									</Badge>
								) : null}
							</div>

							{canLoadWorklogs ? (
								worklogEntriesQuery.status === 'pending' ? (
									<div className='space-y-2'>
										<Skeleton className='h-20 w-full rounded-md' />
										<Skeleton className='h-20 w-full rounded-md' />
									</div>
								) : worklogEntriesQuery.status === 'error' ? (
									<ErrorPlaceholder
										message={`Worklogs error: ${getErrorMessage(worklogEntriesQuery.error)}`}
										className='w-full'
									/>
								) : worklogDebugEntries.length === 0 ? (
									<p className='text-xs text-muted-foreground'>
										No worklog entries for the current filters.
									</p>
								) : (
									<div className='flex max-h-96 flex-col gap-2 overflow-y-auto pr-1'>
										{worklogDebugEntries.map(entry => (
											<WorklogEntryDebugCard
												key={entry.id}
												entry={entry}
											/>
										))}
									</div>
								)
							) : (
								<FilterDependencyMessage>
									Select Jira projects, users, and a date range to inspect worklog entries
								</FilterDependencyMessage>
							)}
						</section>

						<section className='flex flex-col gap-3 rounded-lg border bg-card/30 p-4 shadow-sm'>
							<div className='flex items-center justify-between gap-2'>
								<div className='flex flex-col gap-1'>
									<p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
										Relevant Jira issues
									</p>
									<p className='text-xs text-muted-foreground'>
										Loaded {relevantIssueDebugEntries.length} of {totalRelevantIssues} issues
									</p>
									<AutoLoadProgress
										isLoading={jiraIssuesAutoLoad.isAutoLoading}
										pagesLoaded={jiraIssuesAutoLoad.pagesLoaded}
										totalPages={jiraIssuesAutoLoad.totalPages}
										progressPercent={jiraIssuesAutoLoad.progressPercent}
									/>
								</div>
								{totalRelevantIssues > 0 ? (
									<Badge
										variant='secondary'
										className='rounded-sm px-2 text-[11px] font-semibold uppercase tracking-wide'
									>
										{totalRelevantIssues} issues
									</Badge>
								) : null}
							</div>

							{canLoadRelevantIssues ? (
								jiraIssuesQuery.status === 'pending' ? (
									<div className='space-y-2'>
										<Skeleton className='h-20 w-full rounded-md' />
										<Skeleton className='h-20 w-full rounded-md' />
									</div>
								) : jiraIssuesQuery.status === 'error' ? (
									<ErrorPlaceholder
										message={`Issues error: ${getErrorMessage(jiraIssuesQuery.error)}`}
										className='w-full'
									/>
								) : relevantIssueDebugEntries.length === 0 ? (
									<p className='text-xs text-muted-foreground'>
										No issues matched the current filters.
									</p>
								) : (
									<div className='flex max-h-96 flex-col gap-2 overflow-y-auto pr-1'>
										{relevantIssueDebugEntries.map(issue => (
											<RelevantIssueDebugCard
												key={issue.id}
												issue={issue}
											/>
										))}
									</div>
								)
							) : (
								<FilterDependencyMessage>
									Select Jira projects, users, and a date range to load relevant issues
								</FilterDependencyMessage>
							)}
						</section>
					</div>

					<div className='grid gap-6 xl:grid-cols-2'>
						<section className='flex flex-col gap-3 rounded-lg border bg-card/30 p-4 shadow-sm'>
							<div className='flex items-center justify-between gap-2'>
								<div className='flex flex-col gap-1'>
									<p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
										GitLab commits
									</p>
									<p className='text-xs text-muted-foreground'>
										Loaded {gitlabCommitsDebugEntries.length} of {totalGitlabCommits} commits
									</p>
									<AutoLoadProgress
										isLoading={gitlabCommitsAutoLoad.isAutoLoading}
										pagesLoaded={gitlabCommitsAutoLoad.pagesLoaded}
										totalPages={gitlabCommitsAutoLoad.totalPages}
										progressPercent={gitlabCommitsAutoLoad.progressPercent}
									/>
								</div>
								{totalGitlabCommits > 0 ? (
									<Badge
										variant='secondary'
										className='rounded-sm px-2 text-[11px] font-semibold uppercase tracking-wide'
									>
										{totalGitlabCommits} commits
									</Badge>
								) : null}
							</div>

							{canLoadGitlabCommits ? (
								gitlabCommitsQuery.status === 'pending' ? (
									<div className='space-y-2'>
										<Skeleton className='h-20 w-full rounded-md' />
										<Skeleton className='h-20 w-full rounded-md' />
									</div>
								) : gitlabCommitsQuery.status === 'error' ? (
									<ErrorPlaceholder
										message={`GitLab commits error: ${getErrorMessage(gitlabCommitsQuery.error)}`}
										className='w-full'
									/>
								) : gitlabCommitsDebugEntries.length === 0 ? (
									<p className='text-xs text-muted-foreground'>
										No commits matched the current filters.
									</p>
								) : (
									<div className='flex max-h-96 flex-col gap-2 overflow-y-auto pr-1'>
										{gitlabCommitsDebugEntries.map(commit => (
											<GitlabCommitDebugCard
												key={commit.id}
												commit={commit}
											/>
										))}
									</div>
								)
							) : (
								<FilterDependencyMessage>
									Select GitLab projects, contributors, and a date range to load commits
								</FilterDependencyMessage>
							)}
						</section>

						<section className='flex flex-col gap-3 rounded-lg border bg-card/30 p-4 shadow-sm'>
							<div className='flex items-center justify-between gap-2'>
								<div className='flex flex-col gap-1'>
									<p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
										Issues referenced in commits
									</p>
									<p className='text-xs text-muted-foreground'>
										Loaded {commitIssueDebugEntries.length} of {totalCommitReferencedIssues}{' '}
										references
									</p>
									<AutoLoadProgress
										isLoading={commitIssuesAutoLoad.isAutoLoading}
										pagesLoaded={commitIssuesAutoLoad.pagesLoaded}
										totalPages={commitIssuesAutoLoad.totalPages}
										progressPercent={commitIssuesAutoLoad.progressPercent}
									/>
								</div>
								{totalCommitReferencedIssues > 0 ? (
									<Badge
										variant='secondary'
										className='rounded-sm px-2 text-[11px] font-semibold uppercase tracking-wide'
									>
										{totalCommitReferencedIssues} issues
									</Badge>
								) : null}
							</div>

							{commitIssueDebugEntries.length === 0 ? (
								<p className='text-xs text-muted-foreground'>
									No recognizable Jira issue references were found in the selected commits.
								</p>
							) : commitIssuesFromGitlabQuery.status === 'pending' ? (
								<div className='space-y-2'>
									<Skeleton className='h-20 w-full rounded-md' />
									<Skeleton className='h-20 w-full rounded-md' />
								</div>
							) : commitIssuesFromGitlabQuery.status === 'error' ? (
								<ErrorPlaceholder
									message={`Commit issues error: ${getErrorMessage(commitIssuesFromGitlabQuery.error)}`}
									className='w-full'
								/>
							) : (
								<div className='flex max-h-96 flex-col gap-2 overflow-y-auto pr-1'>
									{commitIssueDebugEntries.map(issue => (
										<RelevantIssueDebugCard
											key={issue.id}
											issue={issue}
										/>
									))}
								</div>
							)}
						</section>
					</div>

					{/* Calendar Worklog Editor POC - kept for future reference */}
					<div className='flex flex-col gap-4 rounded-lg border bg-card/30 p-4 shadow-sm'>
						<div>
							<h2 className='text-lg font-semibold'>Calendar Worklog Editor (POC)</h2>
							<p className='text-xs text-muted-foreground'>
								Quick proof of concept for local worklog editing with apply/revert
							</p>
						</div>

						<div className='flex flex-wrap gap-3'>
							<DateRangeFilter
								value={state.calendarViewDateRange}
								onChange={handleCalendarViewDateRangeChange}
							/>

							<WorklogChangesActions
								worklogChanges={worklogChanges}
								onApply={handleWorklogApply}
								onRevert={handleWorklogRevert}
							/>
						</div>

						<WorklogChangesSummary worklogChanges={worklogChanges} />

						<div className='flex flex-col gap-2'>
							<p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
								Local Entries ({state.localWorklogEntries.size})
							</p>
							{state.localWorklogEntries.size === 0 ? (
								<p className='text-xs text-muted-foreground'>No worklog entries loaded yet</p>
							) : (
								<div className='max-h-64 space-y-1 overflow-y-auto text-xs'>
									{Array.from(state.localWorklogEntries.values()).map(entry => (
										<div
											key={entry.localId}
											className='flex items-center justify-between rounded border px-2 py-1'
										>
											<div className='flex-1'>
												<span className='font-medium'>{entry.issueKey}</span>
												<span className='mx-2 text-muted-foreground'>•</span>
												<span>{formatDurationFromSeconds(entry.timeSpentSeconds)}</span>
												{entry.isNew && (
													<Badge
														variant='outline'
														className='ml-2 h-4 px-1 text-[10px]'
													>
														new
													</Badge>
												)}
											</div>
											<Button
												size='sm'
												variant='ghost'
												onClick={() => handleWorklogDelete(entry.localId)}
												className='h-6 px-2'
											>
												Delete
											</Button>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			</CollapsibleSection>
		</div>
	)
}

interface CollapsibleSectionProps {
	title: string
	description: string
	meta?: ReactNode
	children: ReactNode
	open?: boolean
	defaultOpen?: boolean
	onOpenChange?: (open: boolean) => void
}

function CollapsibleSection({
	title,
	description,
	meta,
	children,
	open,
	defaultOpen,
	onOpenChange
}: CollapsibleSectionProps): React.ReactNode {
	return (
		<details
			className='group rounded-xl border bg-card/30 shadow-sm'
			open={open ?? defaultOpen}
			onToggle={event => onOpenChange?.(event.currentTarget.open)}
		>
			<summary className='flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-muted/50'>
				<div className='flex items-center gap-3'>
					<ChevronDown className='h-5 w-5 transition-transform group-open:rotate-180' />
					<div>
						<h2 className='text-lg font-semibold'>{title}</h2>
						<p className='text-xs text-muted-foreground'>{description}</p>
					</div>
				</div>
				{meta ? <div className='flex flex-wrap items-center gap-2'>{meta}</div> : null}
			</summary>
			<div className='border-t p-6'>{children}</div>
		</details>
	)
}
