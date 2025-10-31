import type { DateRange } from 'react-day-picker'
import type { LocalWorklogEntry, WorklogCalendarEvent } from '~/entities/index.ts'
import type {
	DayPropGetter,
	EventPropGetter,
	NavigateAction,
	SlotPropGetter,
	View
} from 'react-big-calendar'
import type { WorklogsPageLoaderData } from './types.ts'

import { DateTime, Settings } from 'luxon'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { invariant } from '~/lib/util/index.ts'
import { luxonLocalizer, Views } from 'react-big-calendar'

import { useJiraProjectsQuery } from '~/features/load-jira-projects/index.ts'
import { useJiraUsersQuery } from '~/features/load-jira-users/index.ts'
import { useWorklogEntriesQuery } from '~/features/load-worklog-entries/index.ts'
import { useJiraIssuesQuery } from '~/features/load-jira-issues/index.ts'
import { useGitlabProjectsQuery } from '~/features/load-gitlab-projects/index.ts'
import { useGitlabContributorsQuery } from '~/features/load-gitlab-contributors/index.ts'
import { useGitlabCommitsQuery } from '~/features/load-gitlab-commits/index.ts'
import { useCommitIssuesQuery } from '~/features/load-commit-issues/index.ts'

import { compareWorklogEntries, useWorklogState } from '~/features/manage-worklogs/index.ts'

import { generateColorFromString } from '~/shared/index.ts'
import { useAutoLoadInfiniteQuery } from '~/shared/lib/query/index.ts'
import { calculateWorklogsFromCommits } from '../lib/calculate-worklogs-from-commits.ts'

export function useWorklogsPageState(loaderData: WorklogsPageLoaderData) {
	invariant(loaderData.user?.atlassian?.id, 'Atlassian profile ID is required in loader data')
	invariant(loaderData.user?.gitlab?.id, 'GitLab profile ID is required in loader data')
	const atlassianUserIdRaw = loaderData.user.atlassian?.id
	const gitlabUserIdRaw = loaderData.user.gitlab?.id
	// Narrow to string types for linter and type-safety
	const atlassianUserId = atlassianUserIdRaw as string
	const gitlabUserId = gitlabUserIdRaw as string

	// Preferences - loaderData.preferences already has defaults merged from root loader
	const preferences = loaderData.preferences ?? {}

	const weekStartsOn = preferences.weekStartsOn ?? 1
	const workingDayStartTime = preferences.workingDayStartTime ?? '09:00'
	const workingDayEndTime = preferences.workingDayEndTime ?? '18:00'
	const calendarCompactMode = preferences.calendarCompactMode ?? 'standard'

	// Localizer per user settings
	const luxonFirstDayOfWeek = weekStartsOn === 0 ? 7 : weekStartsOn
	const timezone = preferences.timezone ?? 'UTC'

	const localizer = useMemo(() => {
		// Configure Luxon's default timezone for react-big-calendar
		// This must be set before creating the localizer
		Settings.defaultZone = timezone

		// Recreate localizer when timezone or weekStartsOn changes
		// The localizer will use Settings.defaultZone internally
		return luxonLocalizer(DateTime, { firstDayOfWeek: luxonFirstDayOfWeek })
	}, [luxonFirstDayOfWeek, timezone])

	// Feature state
	const [state, dispatch] = useWorklogState()

	// Calendar view state
	const [calendarView, setCalendarView] = useState<View>(Views.WEEK)
	const [calendarDate, setCalendarDate] = useState<Date>(() => state.dateRange?.from ?? new Date())

	// Queries
	const projectsQuery = useJiraProjectsQuery({ userId: atlassianUserId })
	const usersQuery = useJiraUsersQuery({
		userId: atlassianUserId,
		projectIds: state.selectedJiraProjectIds
	})
	const worklogEntriesQuery = useWorklogEntriesQuery({
		userId: atlassianUserId,
		projectIds: state.selectedJiraProjectIds,
		userIds: state.selectedJiraUserIds,
		dateRange: state.dateRange
	})
	const jiraIssuesQuery = useJiraIssuesQuery({
		userId: atlassianUserId,
		projectIds: state.selectedJiraProjectIds,
		userIds: state.selectedJiraUserIds,
		dateRange: state.dateRange
	})
	const gitlabProjectsQuery = useGitlabProjectsQuery({ userId: gitlabUserId })
	const gitlabContributorsQuery = useGitlabContributorsQuery({
		userId: gitlabUserId,
		projectIds: state.selectedGitlabProjectIds,
		dateRange: state.dateRange
	})
	const gitlabCommitsQuery = useGitlabCommitsQuery({
		userId: gitlabUserId,
		projectIds: state.selectedGitlabProjectIds,
		contributorIds: state.selectedGitlabContributorIds,
		dateRange: state.dateRange
	})

	// Derived flags
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

	// Helpers
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

	const commitIssuesFromGitlabQuery = useCommitIssuesQuery({ issueKeys: commitIssueKeys })
	const commitIssuesAutoLoad = useAutoLoadInfiniteQuery(commitIssuesFromGitlabQuery, {
		enabled: commitIssueKeys.length > 0
	})

	// Effects
	useEffect(() => {
		if (state.dateRange?.from) {
			setCalendarDate(state.dateRange.from)
		}
	}, [state.dateRange?.from])

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

	// Derived data
	const worklogChanges = useMemo(
		() => compareWorklogEntries(state.loadedWorklogEntries, state.localWorklogEntries),
		[state.loadedWorklogEntries, state.localWorklogEntries]
	)

	const worklogDebugEntries = useMemo(() => {
		const loadedEntries =
			worklogEntriesQuery.data?.pages.flatMap(page =>
				page.entries
					// Only include entries for the current user
					.filter(entry => entry.worklog.author?.accountId === atlassianUserId)
					.map(entry => ({
						id: entry.id,
						issueKey: entry.issueKey,
						summary: entry.summary ?? 'Untitled issue',
						projectName: entry.project?.name ?? entry.project?.key ?? 'Unknown project',
						authorName:
							entry.worklog.author?.displayName ??
							entry.worklog.author?.accountId ??
							'Unknown author',
						authorAccountId: entry.worklog.author?.accountId ?? '',
						started: entry.worklog.started,
						timeSpentSeconds: entry.worklog.timeSpentSeconds ?? 0
					}))
			) ?? []

		// Convert local worklog entries to debug entries format
		// Only include entries for the current user
		const localEntries = Array.from(state.localWorklogEntries.values()).map(entry => ({
			id: entry.id ?? entry.localId,
			issueKey: entry.issueKey,
			summary: entry.summary,
			projectName: entry.projectName,
			authorName: entry.authorName,
			authorAccountId: atlassianUserId,
			started: entry.started,
			timeSpentSeconds: entry.timeSpentSeconds
		}))

		// Merge loaded and local entries, with local entries taking precedence for duplicates
		const entriesMap = new Map<string, (typeof loadedEntries)[0]>()

		// Add loaded entries first
		for (const entry of loadedEntries) {
			if (entry.id) {
				entriesMap.set(entry.id, entry)
			}
		}

		// Add/override with local entries
		// Use localId as fallback key for entries that don't have an id yet
		for (const entry of localEntries) {
			const key = entry.id || `local-${entry.issueKey}-${entry.started}`
			entriesMap.set(key, entry)
		}

		return Array.from(entriesMap.values())
	}, [worklogEntriesQuery.data, state.localWorklogEntries, atlassianUserId])

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
		const allIssues = commitIssuesFromGitlabQuery.data.pages.flatMap(page => page.issues)

		// Sort by createdAt (descending), then by issue key (ascending) as fallback
		const sortedIssues = allIssues.slice().sort((a, b) => {
			const aCreated = a.fields.created ? new Date(a.fields.created).getTime() : 0
			const bCreated = b.fields.created ? new Date(b.fields.created).getTime() : 0
			if (aCreated !== bCreated) {
				return bCreated - aCreated // Descending (newest first)
			}
			// Fallback to issue key if createdAt is the same or missing
			return (a.key ?? '').localeCompare(b.key ?? '')
		})

		return sortedIssues.map(issue => ({
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
	}, [commitIssuesFromGitlabQuery.data])

	const totalWorklogEntries = worklogEntriesQuery.data?.pages?.[0]?.pageInfo.total ?? 0
	const totalRelevantIssues = jiraIssuesQuery.data?.pages?.[0]?.pageInfo.total ?? 0
	const totalGitlabCommits = gitlabCommitsQuery.data?.pages?.[0]?.pageInfo.total ?? 0
	const totalCommitReferencedIssues = commitIssueKeys.length

	// Calendar transforms and getters
	// React Big Calendar will automatically use the timezone from Settings.defaultZone
	// via the localizer, so we just need to ensure events update when preferences change
	const calendarEvents = useMemo<WorklogCalendarEvent[]>(() => {
		if (!worklogDebugEntries || worklogDebugEntries.length === 0) {
			return []
		}

		// Reference timezone to ensure recalculation when it changes
		// The localizer handles timezone display, but we need to trigger recalculation
		void preferences.timezone

		return worklogDebugEntries
			.filter(entry => entry.started && entry.timeSpentSeconds > 0)
			.map<WorklogCalendarEvent>(entry => {
				// Date objects represent absolute moments in time (UTC)
				// React Big Calendar + Luxon localizer will handle timezone display
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
						authorAccountId: entry.authorAccountId,
						timeSpentSeconds: entry.timeSpentSeconds,
						started: entry.started ?? new Date().toISOString()
					}
				}
			})
	}, [worklogDebugEntries, preferences.timezone])

	const calendarEventPropGetter = useCallback<EventPropGetter<WorklogCalendarEvent>>(event => {
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

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Derived time-window with bounds and event scanning
	const calendarBusinessHours = useMemo(() => {
		const base = calendarDate ?? new Date()
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

		const startMinutes = (startHourStr ?? 9) * 60 + (startMinStr ?? 0) - 30
		const endMinutes = (endHourStr ?? 18) * 60 + (endMinStr ?? 0) + 30
		let minHour = Math.floor(Math.max(0, startMinutes) / 60)
		let minMinutes = Math.max(0, startMinutes) % 60
		let maxHour = Math.floor(Math.min(24 * 60, endMinutes) / 60)
		let maxMinutes = Math.min(24 * 60, endMinutes) % 60

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

	// Handlers
	const handleJiraProjectIdsChange = useCallback(
		(value: string[]) => {
			dispatch({ type: 'selectedJiraProjectIds.select', payload: value })
		},
		[dispatch]
	)
	const handleJiraUserIdsChange = useCallback(
		(value: string[]) => {
			dispatch({ type: 'selectedJiraUserIds.select', payload: value })
		},
		[dispatch]
	)
	const handleDateRangeChange = useCallback(
		(value: DateRange | undefined) => {
			dispatch({ type: 'dateRange.select', payload: value })
		},
		[dispatch]
	)
	const handleGitlabProjectIdsChange = useCallback(
		(value: string[]) => {
			dispatch({ type: 'selectedGitlabProjectIds.select', payload: value })
		},
		[dispatch]
	)
	const handleGitlabContributorIdsChange = useCallback(
		(value: string[]) => {
			dispatch({ type: 'selectedGitlabContributorIds.select', payload: value })
		},
		[dispatch]
	)
	const handleCalendarViewDateRangeChange = useCallback(
		(value: DateRange | undefined) => {
			dispatch({ type: 'calendarViewDateRange.select', payload: value })
		},
		[dispatch]
	)

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
			handleCalendarViewDateRangeChange(from && to ? { from, to } : undefined)
		},
		[handleCalendarViewDateRangeChange]
	)

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex idempotent logic for creating worklog entries from commits
	const handleApplyWorklogsFromCommits = useCallback(() => {
		// Get all commits from pages
		const commits = gitlabCommitsQuery.data?.pages.flatMap(page => page.commits) ?? []

		// Get all issues from commit issues query
		const issuesMap = new Map<string, { key: string; summary: string; projectName: string }>()
		for (const page of commitIssuesFromGitlabQuery.data?.pages ?? []) {
			for (const issue of page.issues) {
				issuesMap.set(issue.key.toUpperCase(), {
					key: issue.key,
					summary: issue.fields.summary ?? 'Untitled issue',
					projectName: issue.fields.project?.name ?? issue.fields.project?.key ?? 'Unknown project'
				})
			}
		}

		// Get current user info
		const authorName = loaderData.user?.atlassian?.email ?? 'Current User'
		const authorAccountId = atlassianUserId

		// Calculate worklogs from commits
		const worklogEntries = calculateWorklogsFromCommits(
			commits.map(commit => ({
				createdAt: commit.createdAt,
				issueKeys: commit.issueKeys ?? []
			})),
			issuesMap,
			preferences,
			authorName,
			authorAccountId
		)

		// Check for existing entries to avoid duplicates
		// Create a set of existing entry signatures: issueKey + started (rounded to minute) + timeSpentSeconds
		const existingEntries = new Set<string>()

		// Check loaded entries
		for (const page of worklogEntriesQuery.data?.pages ?? []) {
			for (const entry of page.entries) {
				// Only check entries for current user
				if (entry.worklog.author?.accountId !== atlassianUserId) {
					continue
				}
				if (entry.worklog.started) {
					const startedDate = new Date(entry.worklog.started)
					const roundedStarted = new Date(
						startedDate.getFullYear(),
						startedDate.getMonth(),
						startedDate.getDate(),
						startedDate.getHours(),
						startedDate.getMinutes(),
						0
					)
					const signature = `${entry.issueKey}|${roundedStarted.toISOString()}|${entry.worklog.timeSpentSeconds ?? 0}`
					existingEntries.add(signature)
				}
			}
		}

		// Check local entries
		for (const entry of state.localWorklogEntries.values()) {
			// Round started time to minute for comparison
			const startedDate = new Date(entry.started)
			const roundedStarted = new Date(
				startedDate.getFullYear(),
				startedDate.getMonth(),
				startedDate.getDate(),
				startedDate.getHours(),
				startedDate.getMinutes(),
				0
			)
			const signature = `${entry.issueKey}|${roundedStarted.toISOString()}|${entry.timeSpentSeconds}`
			existingEntries.add(signature)
		}

		// Only create entries that don't already exist
		for (const entry of worklogEntries) {
			// Round started time to minute for comparison
			const startedDate = new Date(entry.started)
			const roundedStarted = new Date(
				startedDate.getFullYear(),
				startedDate.getMonth(),
				startedDate.getDate(),
				startedDate.getHours(),
				startedDate.getMinutes(),
				0
			)
			const signature = `${entry.issueKey}|${roundedStarted.toISOString()}|${entry.timeSpentSeconds}`

			if (!existingEntries.has(signature)) {
				dispatch({ type: 'worklog.create', payload: entry })
			}
		}
	}, [
		dispatch,
		gitlabCommitsQuery.data,
		commitIssuesFromGitlabQuery.data,
		preferences,
		loaderData.user?.atlassian?.email,
		atlassianUserId,
		state.localWorklogEntries,
		worklogEntriesQuery.data
	])

	// Check if we can apply worklogs from commits
	const canApplyWorklogsFromCommits = useMemo(() => {
		const hasCommits =
			(gitlabCommitsQuery.data?.pages.flatMap(page => page.commits) ?? []).length > 0
		const hasCommitIssues =
			(commitIssuesFromGitlabQuery.data?.pages.flatMap(page => page.issues) ?? []).length > 0
		return hasCommits && hasCommitIssues && canLoadGitlabCommits
	}, [gitlabCommitsQuery.data, commitIssuesFromGitlabQuery.data, canLoadGitlabCommits])

	return {
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
	}
}
