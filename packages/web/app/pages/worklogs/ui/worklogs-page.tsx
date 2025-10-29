import type { WorklogCalendarEvent } from '~/entities/index.ts'
import type { CalendarProps } from 'react-big-calendar'
import type { WorklogsPageProps } from '../model/types.ts'

import { useWorklogsPageState } from '../model/use-worklogs-page-state.ts'

import { useCallback, useMemo, useState } from 'react'
import { BugIcon, CalendarDays, ChevronDown } from 'lucide-react'
import { Views } from 'react-big-calendar'

import { Badge } from '~/shared/ui/shadcn/ui/badge.tsx'
import { Button } from '~/shared/ui/shadcn/ui/button.tsx'
import { Skeleton } from '~/shared/ui/shadcn/ui/skeleton.tsx'
import { AutoLoadProgress } from '~/shared/index.ts'
import { WorklogsCalendar } from '~/widgets/worklogs-calendar/index.ts'
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
import { JiraIssueSearchPanel } from '~/features/search-jira-issues/index.ts'
import type { DraggableIssue } from '~/features/search-jira-issues/index.ts'

// FSD widgets
import { FiltersPanel, FilterDependencyMessage } from '~/widgets/filters-panel/index.ts'
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
		handleControlledCalendarRangeChange
	} = useWorklogsPageState(loaderData)

	const [isDebugOpen, setIsDebugOpen] = useState(false)
	const isDebugPresetAvailable = import.meta.env.DEV

	// Calendar compact mode mutation
	const compactModeMutation = useUpdateCalendarCompactMode()

	const handleCompactModeChange = useCallback(
		(mode: typeof calendarCompactMode) => {
			compactModeMutation.mutate({ calendarCompactMode: mode })
		},
		[compactModeMutation]
	)

	// Handle issue drop from search panel onto calendar
	const handleIssueDropOnCalendar = useCallback((args: any) => {
		try {
			// Get issue data from drag event
			const issueData = JSON.parse(
				args.draggedEl?.getAttribute('data-issue') ?? '{}'
			) as DraggableIssue

			// TODO: Open dialog to create worklog entry with the issue data
			// For now, we'll just show an alert
			alert(
				`Creating worklog for ${issueData.key}: ${issueData.summary}\nFrom: ${new Date(args.start).toLocaleString()}\nTo: ${new Date(args.end).toLocaleString()}`
			)
		} catch {
			// Silently ignore parse errors for invalid drag data
		}
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

	return (
		<div className='flex flex-col gap-6 grow bg-background'>
			{/* Subtle loading indicator */}
			{isAnyQueryLoading && (
				<div className='fixed top-0 left-0 right-0 z-50 h-0.5 bg-primary/20'>
					<div className='h-full bg-primary animate-pulse' />
				</div>
			)}

			<div className='flex flex-col gap-4'>
				<div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
					<div>
						<h1 className='text-3xl font-bold'>Worklogs</h1>
						<p className='mt-1 text-sm text-muted-foreground'>
							Apply filters to view and manage Jira worklogs
						</p>
					</div>
					{isDebugPresetAvailable ? (
						<Button
							type='button'
							variant='outline'
							size='sm'
							onClick={handleApplyDebugPreset}
						>
							<BugIcon />
							Load Debug Preset
						</Button>
					) : null}
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
			</div>

			{/* Main calendar view */}
			<div className='flex flex-col gap-4 grow'>
				{canLoadWorklogs ? (
					worklogEntriesQuery.status === 'pending' ? (
						<div className='flex flex-col items-center justify-center py-24 text-center'>
							<div className='mb-4'>
								<div className='h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin' />
							</div>
							<h2 className='text-xl font-semibold text-foreground mb-2'>Loading worklogs...</h2>
							<p className='text-sm text-muted-foreground'>
								Fetching {totalWorklogEntries > 0 ? `${totalWorklogEntries} ` : ''}worklog entries
							</p>
						</div>
					) : worklogEntriesQuery.status === 'error' ? (
						<div className='flex flex-col items-center justify-center py-24 text-center'>
							<div className='h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4'>
								<span className='text-2xl text-destructive'>✕</span>
							</div>
							<h2 className='text-xl font-semibold text-foreground mb-2'>
								Failed to load worklogs
							</h2>
							<p className='text-sm text-muted-foreground max-w-md'>
								{getErrorMessage(worklogEntriesQuery.error)}
							</p>
						</div>
					) : worklogDebugEntries.length === 0 ? (
						<div className='flex flex-col items-center justify-center py-24 text-center'>
							<div className='h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4'>
								<CalendarDays className='h-8 w-8 text-muted-foreground' />
							</div>
							<h2 className='text-xl font-semibold text-foreground mb-2'>No worklogs found</h2>
							<p className='text-sm text-muted-foreground max-w-md'>
								No worklog entries match your current filters. Try adjusting the date range or
								selected users.
							</p>
						</div>
					) : (
						<>
							<div className='flex items-center justify-between mb-3'>
								<div>
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
									<div className='flex flex-wrap items-center gap-3 mb-3 pb-3 border-b'>
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
							<div className='flex gap-4 grow'>
								{/* Search Panel */}
								<div className='w-80 rounded-lg border bg-card shadow-sm shrink-0 flex flex-col'>
									<JiraIssueSearchPanel
										userId={loaderData.user.atlassian.id}
										projectIds={state.selectedJiraProjectIds}
										relevantIssues={
											jiraIssuesQuery.data?.pages
												.flatMap(page => page.issues)
												.slice(0, 10)
												.map(issue => ({
													id: issue.id,
													key: issue.key,
													summary: issue.fields.summary ?? 'No summary',
													projectKey: issue.fields.project?.key ?? '',
													projectName: issue.fields.project?.name ?? ''
												})) ?? []
										}
										referencedIssues={
											commitIssuesFromGitlabQuery.data?.pages
												.flatMap(page => page.issues)
												.slice(0, 10)
												.map(issue => ({
													id: issue.id,
													key: issue.key,
													summary: issue.fields.summary ?? 'No summary',
													projectKey: issue.fields.project?.key ?? '',
													projectName: issue.fields.project?.name ?? ''
												})) ?? []
										}
									/>
								</div>

								{/* Calendar */}
								<div className='flex-1 rounded-lg border bg-card shadow-sm overflow-hidden'>
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
									/>
								</div>
							</div>
						</>
					)
				) : (
					<div className='flex flex-col items-center justify-center py-24 text-center'>
						<CalendarDays className='h-16 w-16 text-muted-foreground/40 mb-4' />
						<h2 className='text-xl font-semibold text-foreground mb-2'>No filters selected</h2>
						<p className='text-sm text-muted-foreground max-w-md'>
							Select Jira projects, users, and a date range above to load and visualize your worklog
							entries on the calendar.
						</p>
					</div>
				)}
			</div>

			{/* Collapsible debug panels */}
			<details
				className='group rounded-lg border bg-card/30 shadow-sm'
				open={isDebugOpen}
				onToggle={e => setIsDebugOpen((e.target as HTMLDetailsElement).open)}
			>
				<summary className='flex cursor-pointer items-center justify-between p-4 hover:bg-muted/50 transition-colors'>
					<div className='flex items-center gap-3'>
						<ChevronDown className='h-5 w-5 transition-transform group-open:rotate-180' />
						<div>
							<h2 className='text-lg font-semibold'>Debug Data</h2>
							<p className='text-xs text-muted-foreground'>View detailed data from all queries</p>
						</div>
					</div>
					<div className='flex items-center gap-2'>
						{totalWorklogEntries > 0 && (
							<Badge
								variant='secondary'
								className='rounded-sm'
							>
								{totalWorklogEntries} worklogs
							</Badge>
						)}
						{totalRelevantIssues > 0 && (
							<Badge
								variant='secondary'
								className='rounded-sm'
							>
								{totalRelevantIssues} issues
							</Badge>
						)}
						{totalGitlabCommits > 0 && (
							<Badge
								variant='secondary'
								className='rounded-sm'
							>
								{totalGitlabCommits} commits
							</Badge>
						)}
					</div>
				</summary>

				<div className='border-t p-4'>
					<div className='grid gap-4 xl:grid-cols-2'>
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

					<div className='grid gap-4 xl:grid-cols-2 mt-4'>
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
							) : commitIssueDebugEntries.length === 0 ? (
								<p className='text-xs text-muted-foreground'>
									Commit references did not resolve to accessible Jira issues.
								</p>
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
					<div className='flex flex-col gap-4 rounded-lg border bg-card/30 p-4 shadow-sm mt-4'>
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
			</details>
		</div>
	)
}
