import type { DateRange } from 'react-day-picker'
import type { LocalWorklogEntry, WorklogCalendarEvent } from '~/entities/index.ts'

import type {
	CalendarProps,
	DayPropGetter,
	EventPropGetter,
	NavigateAction,
	SlotPropGetter,
	View
} from 'react-big-calendar'

import type { WorklogsPageProps } from '../model/types.ts'

import { useWorklogsPageState } from '../model/use-worklogs-page-state.ts'

import { BugIcon, CalendarDays, ChevronDown } from 'lucide-react'
import { Views } from 'react-big-calendar'

import { Badge } from '~/components/shadcn/ui/badge.tsx'
import { Button } from '~/components/shadcn/ui/button.tsx'
import { Skeleton } from '~/components/shadcn/ui/skeleton.tsx'
import { AutoLoadProgress } from '~/components/ui/auto-load-progress.tsx'
import { WorklogsCalendar } from '~/widgets/worklogs-calendar/index.ts'
import { invariant } from '~/lib/util/index.ts'

import { DateRangeFilter } from '~/features/select-date-range/index.ts'

// FSD shared layer imports
import { ErrorPlaceholder, formatDurationFromSeconds, getErrorMessage } from '~/shared/index.ts'

// FSD manage-worklogs feature
import { WorklogChangesActions, WorklogChangesSummary } from '~/features/manage-worklogs/index.ts'

// FSD widgets
import { FiltersPanel, FilterDependencyMessage } from '~/widgets/filters-panel/index.ts'
import {
	WorklogEntryDebugCard,
	RelevantIssueDebugCard,
	GitlabCommitDebugCard
} from '~/widgets/debug-panel/index.ts'

const FORMATS: CalendarProps<WorklogCalendarEvent>['formats'] = {
	dayFormat: 'EEE, MMM d',
	timeGutterFormat: 'HH:mm'
}

export function WorklogsPage({ loaderData }: WorklogsPageProps): React.ReactNode {
	invariant(loaderData.user?.atlassian?.id, 'Atlassian profile ID is required in loader data')
	invariant(loaderData.user?.gitlab?.id, 'GitLab profile ID is required in loader data')

	const {
		workingDayStartTime,
		workingDayEndTime,
		localizer,
		state,
		dispatch,
		projectsQuery,
		usersQuery,
		worklogEntriesQuery,
		jiraIssuesQuery,
		gitlabProjectsQuery,
		gitlabContributorsQuery,
		gitlabCommitsQuery,
		commitIssuesFromGitlabQuery,
		worklogAutoLoad,
		jiraIssuesAutoLoad,
		gitlabCommitsAutoLoad,
		commitIssuesAutoLoad,
		hasJiraProjectsSelected,
		hasGitlabProjectsSelected,
		hasCompleteDateRange,
		canLoadWorklogs,
		canLoadRelevantIssues,
		canLoadGitlabCommits,
		worklogChanges,
		worklogDebugEntries,
		relevantIssueDebugEntries,
		gitlabCommitsDebugEntries,
		commitIssueDebugEntries,
		totalWorklogEntries,
		totalRelevantIssues,
		totalGitlabCommits,
		calendarView,
		setCalendarView,
		calendarDate,
		setCalendarDate,
		calendarEvents,
		calendarEventPropGetter,
		calendarDayPropGetter,
		calendarSlotPropGetter,
		calendarBusinessHours,
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

	const projectsQuery = useJiraProjectsQuery({
		userId: loaderData.user.atlassian.id
	})

	const usersQuery = useJiraUsersQuery({
		userId: loaderData.user.atlassian.id,
		projectIds: state.selectedJiraProjectIds
	})

	const worklogEntriesQuery = useWorklogEntriesQuery({
		userId: loaderData.user.atlassian.id,
		projectIds: state.selectedJiraProjectIds,
		userIds: state.selectedJiraUserIds,
		dateRange: state.dateRange
	})

	const jiraIssuesQuery = useJiraIssuesQuery({
		userId: loaderData.user.atlassian.id,
		projectIds: state.selectedJiraProjectIds,
		userIds: state.selectedJiraUserIds,
		dateRange: state.dateRange
	})

	const gitlabProjectsQuery = useGitlabProjectsQuery({
		userId: loaderData.user.gitlab?.id
	})

	const gitlabContributorsQuery = useGitlabContributorsQuery({
		userId: loaderData.user.gitlab?.id,
		projectIds: state.selectedGitlabProjectIds,
		dateRange: state.dateRange
	})

	const gitlabCommitsQuery = useGitlabCommitsQuery({
		userId: loaderData.user.gitlab?.id,
		projectIds: state.selectedGitlabProjectIds,
		contributorIds: state.selectedGitlabContributorIds,
		dateRange: state.dateRange
	})

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
		isDebugPresetAvailable,
		handleCalendarViewDateRangeChange,
		handleDateRangeChange,
		handleGitlabContributorIdsChange,
		handleGitlabProjectIdsChange,
		handleJiraProjectIdsChange,
		handleJiraUserIdsChange
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

	const handleControlledCalendarViewChange = useCallback((nextView: View) => {
		setCalendarView(nextView)
	}, [])

	const handleControlledCalendarNavigate = useCallback(
		(newDate: Date, nextView?: View, _action?: NavigateAction) => {
			setCalendarDate(newDate)
			if (nextView) {
				setCalendarView(nextView)
			}
		},
		[]
	)

	const handleControlledCalendarRangeChange = useCallback(
		(
			range:
				| Date[]
				| { start: Date; end: Date }
				| { start: Date; end: Date; resourceId?: number | string }
				| null
		) => {
			let from: Date | undefined
			let to: Date | undefined

			if (Array.isArray(range)) {
				if (range.length > 0) {
					const sorted = [...range].sort((a, b) => a.getTime() - b.getTime())
					from = sorted[0]
					to = sorted[sorted.length - 1]
				}
			} else if (range && 'start' in range && 'end' in range) {
				from = range.start
				to = range.end
			}

			handleCalendarViewDateRangeChange(
				from && to
					? {
							from,
							to
						}
					: undefined
			)
		},
		[handleCalendarViewDateRangeChange]
	)

	useEffect(() => {
		if (!worklogEntriesQuery.data?.pages) {
			return
		}

		const loadedEntries: LocalWorklogEntry[] = worklogEntriesQuery.data.pages.flatMap(page =>
			page.entries.map(entry => ({
				localId: entry.id,
				id: entry.id,
				issueKey: entry.issueKey,
				summary: entry.summary ?? 'Untitled issue',
				projectName: entry.project?.name ?? entry.project?.key ?? 'Unknown project',
				authorName:
					entry.worklog.author?.displayName ?? entry.worklog.author?.accountId ?? 'Unknown author',
				started: entry.worklog.started ?? new Date().toISOString(),
				timeSpentSeconds: entry.worklog.timeSpentSeconds ?? 0
			}))
		)

		dispatch({ type: 'worklog.setLoaded', payload: loadedEntries })
	}, [dispatch, worklogEntriesQuery.data])

	const hasJiraProjectsSelected = state.selectedJiraProjectIds.length > 0
	const hasGitlabProjectsSelected = state.selectedGitlabProjectIds.length > 0
	const hasGitlabContributorsSelected = state.selectedGitlabContributorIds.length > 0
	const hasCompleteDateRange = Boolean(state.dateRange?.from && state.dateRange?.to)

	const canLoadWorklogs =
		state.selectedJiraProjectIds.length > 0 &&
		state.selectedJiraUserIds.length > 0 &&
		hasCompleteDateRange

	const canLoadRelevantIssues = canLoadWorklogs

	const canLoadGitlabCommits =
		hasGitlabProjectsSelected && hasGitlabContributorsSelected && hasCompleteDateRange

	const gitlabProjectNameById = useMemo(() => {
		if (!gitlabProjectsQuery.data) {
			return new Map<string, string>()
		}

		return new Map(
			gitlabProjectsQuery.data.projects.map(project => [
				String(project.id),
				project.name_with_namespace ??
					project.name ??
					project.path_with_namespace ??
					String(project.id)
			])
		)
	}, [gitlabProjectsQuery.data])

	const commitIssueKeys = useMemo(() => {
		const keys = new Set<string>()
		for (const page of gitlabCommitsQuery.data?.pages ?? []) {
			for (const key of page.issueKeys ?? []) {
				keys.add(key)
			}
		}
		return Array.from(keys)
	}, [gitlabCommitsQuery.data])

	// Auto-load all pages for infinite queries
	const worklogAutoLoad = useAutoLoadInfiniteQuery(worklogEntriesQuery, {
		enabled: canLoadWorklogs
	})
	const jiraIssuesAutoLoad = useAutoLoadInfiniteQuery(jiraIssuesQuery, {
		enabled: canLoadRelevantIssues
	})
	const gitlabCommitsAutoLoad = useAutoLoadInfiniteQuery(gitlabCommitsQuery, {
		enabled: canLoadGitlabCommits
	})

	const commitIssuesFromGitlabQuery = useCommitIssuesQuery({
		issueKeys: commitIssueKeys
	})

	const commitIssuesAutoLoad = useAutoLoadInfiniteQuery(commitIssuesFromGitlabQuery, {
		enabled: commitIssueKeys.length > 0
	})

	const worklogDebugEntries = useMemo(() => {
		if (!worklogEntriesQuery.data?.pages) {
			return []
		}

		return worklogEntriesQuery.data.pages.flatMap(page =>
			page.entries.map(entry => ({
				id: entry.id,
				issueKey: entry.issueKey,
				summary: entry.summary ?? 'Untitled issue',
				projectName: entry.project?.name ?? entry.project?.key ?? 'Unknown project',
				authorName:
					entry.worklog.author?.displayName ?? entry.worklog.author?.accountId ?? 'Unknown author',
				started: entry.worklog.started,
				timeSpentSeconds: entry.worklog.timeSpentSeconds ?? 0
			}))
		)
	}, [worklogEntriesQuery.data])

	const relevantIssueDebugEntries = useMemo(() => {
		if (!jiraIssuesQuery.data?.pages) {
			return []
		}

		return jiraIssuesQuery.data.pages.flatMap(page =>
			page.issues.map(issue => ({
				id: issue.id,
				key: issue.key,
				summary: issue.fields.summary ?? 'Untitled issue',
				projectName: issue.fields.project?.name ?? issue.fields.project?.key ?? 'Unknown project',
				status: issue.fields.status?.name ?? 'Unknown status',
				assignee:
					issue.fields.assignee?.displayName ?? issue.fields.assignee?.accountId ?? 'Unassigned',
				updated: issue.fields.updated ?? issue.fields.created,
				created: issue.fields.created
			}))
		)
	}, [jiraIssuesQuery.data])

	const gitlabCommitsDebugEntries = useMemo(() => {
		if (!gitlabCommitsQuery.data?.pages) {
			return []
		}

		return gitlabCommitsQuery.data.pages.flatMap(page =>
			page.commits.map(commit => ({
				id: commit.id,
				shortId: commit.shortId,
				title: commit.title || commit.message?.split('\n')[0] || commit.id.slice(0, 8),
				authorLabel: commit.authorEmail
					? `${commit.authorName ?? 'Unknown'} (${commit.authorEmail})`
					: (commit.authorName ?? 'Unknown author'),
				projectName:
					gitlabProjectNameById.get(String(commit.projectId)) ?? `Project ${commit.projectId}`,
				createdAt: commit.createdAt ?? undefined,
				issueKeys: commit.issueKeys ?? []
			}))
		)
	}, [gitlabCommitsQuery.data, gitlabProjectNameById])

	const commitIssueDebugEntries = useMemo(() => {
		if (!commitIssuesFromGitlabQuery.data?.pages) {
			return []
		}

		return commitIssuesFromGitlabQuery.data.pages.flatMap(page =>
			page.issues.map(issue => ({
				id: issue.id,
				key: issue.key,
				summary: issue.fields.summary ?? 'Untitled issue',
				projectName: issue.fields.project?.name ?? issue.fields.project?.key ?? 'Unknown project',
				status: issue.fields.status?.name ?? 'Unknown status',
				assignee:
					issue.fields.assignee?.displayName ?? issue.fields.assignee?.accountId ?? 'Unassigned',
				updated: issue.fields.updated ?? issue.fields.created,
				created: issue.fields.created
			}))
		)
	}, [commitIssuesFromGitlabQuery.data])

	const totalWorklogEntries = worklogEntriesQuery.data?.pages?.[0]?.pageInfo.total ?? 0
	const totalRelevantIssues = jiraIssuesQuery.data?.pages?.[0]?.pageInfo.total ?? 0
	const totalGitlabCommits = gitlabCommitsQuery.data?.pages?.[0]?.pageInfo.total ?? 0
	const totalCommitReferencedIssues = commitIssueKeys.length

	// Transform worklog entries into calendar events
	const calendarEvents = useMemo<WorklogCalendarEvent[]>(() => {
		if (!worklogDebugEntries || worklogDebugEntries.length === 0) {
			return []
		}

		return worklogDebugEntries
			.filter(entry => entry.started && entry.timeSpentSeconds > 0)
			.map<WorklogCalendarEvent>(entry => {
				const startDate = new Date(entry.started ?? new Date().toISOString())
				const endDate = new Date(startDate.getTime() + entry.timeSpentSeconds * 1000)

				return {
					id: entry.id ?? entry.issueKey,
					title: `${entry.issueKey}: ${entry.summary}`,
					start: startDate,
					end: endDate,
					resource: {
						issueKey: entry.issueKey,
						issueSummary: entry.summary,
						projectName: entry.projectName,
						authorName: entry.authorName,
						timeSpentSeconds: entry.timeSpentSeconds,
						started: entry.started ?? new Date().toISOString()
					}
				}
			})
	}, [worklogDebugEntries])

	const calendarEventPropGetter = useCallback<EventPropGetter<WorklogCalendarEvent>>(event => {
		// Generate color based on project name for consistent coloring
		const colors = generateColorFromString(event.resource.projectName)

		return {
			className: 'worklog-calendar__event',
			style: {
				backgroundColor: colors.backgroundColor,
				color: colors.textColor,
				border: `1px solid ${colors.borderColor}`,
				borderRadius: '0.375rem'
			}
		}
	}, [])

	const calendarDayPropGetter = useCallback<DayPropGetter>(date => {
		const isWeekend = date.getDay() === 0 || date.getDay() === 6
		return isWeekend ? { className: 'worklog-calendar__day--weekend' } : {}
	}, [])

	const calendarSlotPropGetter = useCallback<SlotPropGetter>(date => {
		const classNames: string[] = []

		if (date.getDay() === 0 || date.getDay() === 6) {
			classNames.push('worklog-calendar__slot--weekend')
		}

		const hour = date.getHours()
		if (hour < 7 || hour >= 19) {
			classNames.push('worklog-calendar__slot--out-of-office')
		}

		return classNames.length > 0 ? { className: classNames.join(' ') } : {}
	}, [])

	const calendarBusinessHours = useMemo(() => {
		const base = calendarDate ?? new Date()

		// Parse working day times from preferences (format HH:MM)
		const [startHourStr, startMinStr] = (workingDayStartTime ?? '09:00').split(':').map(Number)
		const [endHourStr, endMinStr] = (workingDayEndTime ?? '18:00').split(':').map(Number)
		const isInvalid =
			Number.isNaN(startHourStr) ||
			Number.isNaN(startMinStr) ||
			Number.isNaN(endHourStr) ||
			Number.isNaN(endMinStr)
		const defaultStart = new Date(base)
		defaultStart.setHours(8, 0, 0, 0)
		const defaultEnd = new Date(base)
		defaultEnd.setHours(18, 0, 0, 0)
		if (isInvalid) {
			return { start: defaultStart, end: defaultEnd }
		}

		// Calculate default bounds with -30min buffer before start, +30min buffer after end
		const startMinutes = (startHourStr ?? 9) * 60 + (startMinStr ?? 0) - 30
		const endMinutes = (endHourStr ?? 18) * 60 + (endMinStr ?? 0) + 30

		let minHour = Math.floor(Math.max(0, startMinutes) / 60)
		let minMinutes = Math.max(0, startMinutes) % 60
		let maxHour = Math.floor(Math.min(24 * 60, endMinutes) / 60)
		let maxMinutes = Math.min(24 * 60, endMinutes) % 60

		// Filter events to only those in the current view range
		const viewRange = state.calendarViewDateRange
		const visibleEvents =
			viewRange?.from && viewRange?.to
				? calendarEvents.filter(
						event =>
							viewRange.to &&
							viewRange.from &&
							event.start <= viewRange.to &&
							event.end >= viewRange.from
					)
				: calendarEvents

		// Check if any visible events extend beyond default hours
		if (visibleEvents.length > 0) {
			for (const event of visibleEvents) {
				const eventStartMinutes = event.start.getHours() * 60 + event.start.getMinutes()
				const eventEndMinutes = event.end.getHours() * 60 + event.end.getMinutes()

				const defaultStartMinutes = minHour * 60 + minMinutes
				const defaultEndMinutes = maxHour * 60 + maxMinutes

				if (eventStartMinutes < defaultStartMinutes) {
					minHour = event.start.getHours()
					minMinutes = 0
				}

				if (eventEndMinutes > defaultEndMinutes) {
					maxHour = event.end.getHours()
					maxMinutes = 0
					// If event ends with minutes, include the next hour
					if (event.end.getMinutes() > 0) {
						maxHour += 1
					}
				}
			}
		}

		const start = new Date(base)
		start.setHours(minHour, minMinutes, 0, 0)
		const end = new Date(base)
		end.setHours(maxHour, maxMinutes, 0, 0)

		return { start, end }
	}, [
		calendarDate,
		calendarEvents,
		state.calendarViewDateRange,
		workingDayStartTime,
		workingDayEndTime
	])

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
							<div
								className='rounded-lg border bg-card shadow-sm overflow-hidden'
								style={{ height: '700px' }}
							>
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
								/>
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

							{commitIssueKeys.length === 0 ? (
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
