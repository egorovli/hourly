import type { Route } from './+types/__._index.ts'

import type { DateRange } from 'react-day-picker'
import type { loader as jiraProjectsLoader } from './jira.projects.tsx'
import type { loader as jiraUsersLoader } from './jira.users.tsx'
import type { loader as jiraWorklogEntriesLoader } from './jira.worklog.entries.tsx'
import type { loader as jiraIssuesLoader } from './jira.issues.tsx'
import type { loader as gitlabProjectsLoader } from './gitlab.projects.tsx'
import type { loader as gitlabContributorsLoader } from './gitlab.contributors.tsx'

import { useQuery } from '@tanstack/react-query'
import { Check, UsersIcon, CalendarDays, ChevronDown } from 'lucide-react'
import { useCallback, useMemo, useReducer } from 'react'
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { SiGitlab, SiAtlassian, SiAtlassianHex, SiGitlabHex } from '@icons-pack/react-simple-icons'

import { Button } from '~/components/shadcn/ui/button.tsx'
import { Calendar } from '~/components/shadcn/ui/calendar.tsx'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/shadcn/ui/popover.tsx'
import { Skeleton } from '~/components/shadcn/ui/skeleton.tsx'
import { CollapsibleDebugPanel } from '~/components/worklogs/collapsible-debug-panel.tsx'
import { orm, Token } from '~/lib/mikro-orm/index.ts'
import { getSession } from '~/lib/session/storage.ts'
import { cn, invariant } from '~/lib/util/index.ts'

import { Badge } from '~/components/shadcn/ui/badge.tsx'
import { Separator } from '~/components/shadcn/ui/separator.tsx'

import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from '~/components/shadcn/ui/command.tsx'

interface State {
	selectedJiraProjectIds: string[]
	selectedJiraUserIds: string[]
	selectedGitlabProjectIds: string[]
	selectedGitlabContributorIds: string[]
	dateRange?: DateRange
}

type Action =
	| { type: 'selectedJiraProjectIds.select'; payload: string[] }
	| { type: 'selectedJiraUserIds.select'; payload: string[] }
	| { type: 'selectedGitlabProjectIds.select'; payload: string[] }
	| { type: 'selectedGitlabContributorIds.select'; payload: string[] }
	| { type: 'dateRange.select'; payload: DateRange | undefined }

function reducer(state: State, action: Action): State {
	switch (action.type) {
		case 'selectedJiraProjectIds.select':
			return {
				...state,
				selectedJiraProjectIds: action.payload,
				selectedJiraUserIds: []
			}

		case 'selectedJiraUserIds.select':
			return {
				...state,
				selectedJiraUserIds: action.payload
			}

		case 'selectedGitlabProjectIds.select':
			return {
				...state,
				selectedGitlabProjectIds: action.payload,
				selectedGitlabContributorIds: []
			}

		case 'selectedGitlabContributorIds.select':
			return {
				...state,
				selectedGitlabContributorIds: action.payload
			}

		case 'dateRange.select':
			return {
				...state,
				dateRange: action.payload
			}

		default:
			return state
	}
}

const initialState: State = {
	selectedJiraProjectIds: [],
	selectedJiraUserIds: [],
	selectedGitlabProjectIds: [],
	selectedGitlabContributorIds: []
}

const MAX_DEBUG_ITEMS = 12

interface ErrorPlaceholderProps {
	message: string
	className?: string
}

function ErrorPlaceholder({ message, className }: ErrorPlaceholderProps): React.ReactNode {
	return (
		<output
			className={cn(
				'flex h-10 min-w-32 items-center justify-center rounded-md border border-destructive/50 bg-destructive/10 px-3 text-sm font-medium text-destructive',
				className
			)}
			aria-label={`Error: ${message}`}
			title={message}
		>
			Error
		</output>
	)
}

interface FilterSectionProps {
	title: string
	description?: string
	dependencyHint?: string
	children: React.ReactNode
}

function FilterSection({
	title,
	description,
	dependencyHint,
	children
}: FilterSectionProps): React.ReactNode {
	return (
		<section className='flex flex-col gap-2'>
			<div className='flex items-center gap-2'>
				<span className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
					{title}
				</span>
				{dependencyHint ? (
					<span className='rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
						{dependencyHint}
					</span>
				) : null}
			</div>
			{description ? <p className='text-xs text-muted-foreground'>{description}</p> : null}
			<div className='flex flex-wrap items-center gap-3'>{children}</div>
		</section>
	)
}

interface FilterDependencyMessageProps {
	children: React.ReactNode
}

function FilterDependencyMessage({ children }: FilterDependencyMessageProps): React.ReactNode {
	return (
		<span className='rounded-md border border-dashed border-border px-3 py-1 text-xs text-muted-foreground'>
			{children}
		</span>
	)
}

export default function WorklogsPage({ loaderData }: Route.ComponentProps) {
	// const projectsFetcher = useFetcher()
	invariant(loaderData.user?.atlassian?.id, 'Atlassian profile ID is required in loader data')
	invariant(loaderData.user?.gitlab?.id, 'GitLab profile ID is required in loader data')

	const [state, dispatch] = useReducer(reducer, initialState)

	const projectsQuery = useQuery({
		queryKey: [
			'jira-projects',
			{
				userId: loaderData.user.atlassian.id
			}
		],

		async queryFn({ queryKey, signal, pageParam }) {
			const response = await fetch('/jira/projects', {
				method: 'GET',
				signal
			})

			if (!response.ok) {
				throw new Error('Failed to fetch Jira projects')
			}

			const data = (await response.json()) as Awaited<ReturnType<typeof jiraProjectsLoader>>
			return data
		}
	})

	const usersQuery = useQuery({
		queryKey: [
			'jira-users',
			{
				userId: loaderData.user.atlassian.id,
				projectIds: state.selectedJiraProjectIds
			}
		],

		async queryFn({ queryKey, signal }) {
			const [, { projectIds }] = queryKey as InferQueryKeyParams<typeof queryKey>
			const searchParams = new URLSearchParams([...projectIds.map(id => ['project-id', id])])

			const response = await fetch(`/jira/users?${searchParams}`, {
				method: 'GET',
				signal
			})

			if (!response.ok) {
				throw new Error('Failed to fetch Jira users')
			}

			const data = (await response.json()) as Awaited<ReturnType<typeof jiraUsersLoader>>
			return data
		},

		enabled: state.selectedJiraProjectIds.length > 0
	})

	const worklogEntriesQuery = useQuery({
		queryKey: [
			'jira-worklog-entries',
			{
				userId: loaderData.user.atlassian.id,
				projectIds: state.selectedJiraProjectIds,
				userIds: state.selectedJiraUserIds,
				dateRange: state.dateRange
					? {
							from: state.dateRange.from?.toISOString(),
							to: state.dateRange.to?.toISOString()
						}
					: undefined
			}
		],

		async queryFn({ queryKey, signal }) {
			const [, { projectIds, userIds, dateRange }] = queryKey as InferQueryKeyParams<
				typeof queryKey
			>

			if (!dateRange?.from || !dateRange?.to) {
				throw new Error('Date range is required to fetch worklog entries')
			}

			const fromDate = format(new Date(dateRange.from), 'yyyy-MM-dd')
			const toDate = format(new Date(dateRange.to), 'yyyy-MM-dd')

			const searchParams = new URLSearchParams([
				...projectIds.map(id => ['project-id', id]),
				...userIds.map(id => ['user-id', id]),
				['date-from', fromDate],
				['date-to', toDate]
			])

			const response = await fetch(`/jira/worklog/entries?${searchParams}`, {
				method: 'GET',
				signal
			})

			if (!response.ok) {
				throw new Error('Failed to fetch Jira worklog entries')
			}

			const data = (await response.json()) as Awaited<ReturnType<typeof jiraWorklogEntriesLoader>>
			return data
		},

		enabled:
			state.selectedJiraProjectIds.length > 0 &&
			state.selectedJiraUserIds.length > 0 &&
			Boolean(state.dateRange?.from) &&
			Boolean(state.dateRange?.to)
	})

	const jiraIssuesQuery = useQuery({
		queryKey: [
			'jira-worklog-issues',
			{
				userId: loaderData.user.atlassian.id,
				projectIds: state.selectedJiraProjectIds,
				userIds: state.selectedJiraUserIds,
				dateRange: state.dateRange
					? {
							from: state.dateRange.from?.toISOString(),
							to: state.dateRange.to?.toISOString()
						}
					: undefined
			}
		],

		async queryFn({ queryKey, signal }) {
			const [, { projectIds, userIds, dateRange }] = queryKey as InferQueryKeyParams<
				typeof queryKey
			>

			if (!dateRange?.from || !dateRange?.to) {
				throw new Error('Date range is required to fetch touched issues')
			}

			const fromDate = format(new Date(dateRange.from), 'yyyy-MM-dd')
			const toDate = format(new Date(dateRange.to), 'yyyy-MM-dd')

			const searchParams = new URLSearchParams([
				...projectIds.map(id => ['project-id', id]),
				...userIds.map(id => ['user-id', id]),
				['date-from', fromDate],
				['date-to', toDate]
			])

			const response = await fetch(`/jira/issues?${searchParams}`, {
				method: 'GET',
				signal
			})

			if (!response.ok) {
				throw new Error('Failed to fetch Jira issues')
			}

			const data = (await response.json()) as Awaited<ReturnType<typeof jiraIssuesLoader>>
			return data
		},

		enabled:
			state.selectedJiraProjectIds.length > 0 &&
			state.selectedJiraUserIds.length > 0 &&
			Boolean(state.dateRange?.from) &&
			Boolean(state.dateRange?.to)
	})

	const gitlabProjectsQuery = useQuery({
		queryKey: [
			'gitlab-projects',
			{
				userId: loaderData.user.gitlab?.id
			}
		],

		async queryFn({ signal }) {
			const response = await fetch('/gitlab/projects', {
				method: 'GET',
				signal
			})

			if (!response.ok) {
				throw new Error('Failed to fetch GitLab projects')
			}

			const data = (await response.json()) as Awaited<ReturnType<typeof gitlabProjectsLoader>>
			return data
		},

		enabled: Boolean(loaderData.user.gitlab?.id)
	})

	const gitlabContributorsQuery = useQuery({
		queryKey: [
			'gitlab-contributors',
			{
				userId: loaderData.user.gitlab?.id,
				projectIds: state.selectedGitlabProjectIds,
				dateRange: state.dateRange
					? {
							from: state.dateRange.from?.toISOString(),
							to: state.dateRange.to?.toISOString()
						}
					: undefined
			}
		],

		async queryFn({ queryKey, signal }) {
			const [, { projectIds, dateRange }] = queryKey as InferQueryKeyParams<typeof queryKey>

			if (!dateRange?.from || !dateRange?.to) {
				throw new Error('Date range is required to fetch GitLab contributors')
			}

			const fromDate = format(new Date(dateRange.from), 'yyyy-MM-dd')
			const toDate = format(new Date(dateRange.to), 'yyyy-MM-dd')

			const searchParams = new URLSearchParams([
				...projectIds.map(id => ['project-id', id]),
				['date-from', fromDate],
				['date-to', toDate]
			])

			const response = await fetch(`/gitlab/contributors?${searchParams}`, {
				method: 'GET',
				signal
			})

			if (!response.ok) {
				throw new Error('Failed to fetch GitLab contributors')
			}

			const data = (await response.json()) as Awaited<ReturnType<typeof gitlabContributorsLoader>>
			return data
		},

		enabled:
			Boolean(loaderData.user.gitlab?.id) &&
			state.selectedGitlabProjectIds.length > 0 &&
			Boolean(state.dateRange?.from) &&
			Boolean(state.dateRange?.to)
	})

	const handleJiraProjectIdsChange = useCallback((value: string[]) => {
		dispatch({ type: 'selectedJiraProjectIds.select', payload: value })
	}, [])

	const handleJiraUserIdsChange = useCallback((value: string[]) => {
		dispatch({ type: 'selectedJiraUserIds.select', payload: value })
	}, [])

	const handleDateRangeChange = useCallback((value: DateRange | undefined) => {
		dispatch({ type: 'dateRange.select', payload: value })
	}, [])

	const handleGitlabProjectIdsChange = useCallback((value: string[]) => {
		dispatch({ type: 'selectedGitlabProjectIds.select', payload: value })
	}, [])

	const handleGitlabContributorIdsChange = useCallback((value: string[]) => {
		dispatch({ type: 'selectedGitlabContributorIds.select', payload: value })
	}, [])

	const hasJiraProjectsSelected = state.selectedJiraProjectIds.length > 0
	const hasGitlabProjectsSelected = state.selectedGitlabProjectIds.length > 0
	const hasCompleteDateRange = Boolean(state.dateRange?.from && state.dateRange?.to)
	const canLoadWorklogs =
		state.selectedJiraProjectIds.length > 0 &&
		state.selectedJiraUserIds.length > 0 &&
		hasCompleteDateRange
	const canLoadRelevantIssues = canLoadWorklogs

	const worklogDebugEntries = useMemo(() => {
		if (!worklogEntriesQuery.data) {
			return []
		}

		const entries: WorklogDebugEntry[] = []

		for (const issue of worklogEntriesQuery.data.issues) {
			for (const worklog of issue.worklogs) {
				entries.push({
					id: `${issue.issueId}-${worklog.id}`,
					issueKey: issue.issueKey,
					summary: issue.summary ?? 'Untitled issue',
					projectName: issue.project?.name ?? issue.project?.key ?? 'Unknown project',
					authorName: worklog.author?.displayName ?? worklog.author?.accountId ?? 'Unknown author',
					started: worklog.started,
					timeSpentSeconds: worklog.timeSpentSeconds ?? 0
				})
			}
		}

		return entries
			.sort((a, b) => {
				const aTime = a.started ? new Date(a.started).getTime() : 0
				const bTime = b.started ? new Date(b.started).getTime() : 0
				return bTime - aTime
			})
			.slice(0, MAX_DEBUG_ITEMS)
	}, [worklogEntriesQuery.data])

	const relevantIssueDebugEntries = useMemo(() => {
		if (!jiraIssuesQuery.data) {
			return []
		}

		const entries: RelevantIssueDebugEntry[] = jiraIssuesQuery.data.issues.map(issue => ({
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

		return entries
			.sort((a, b) => {
				const aTime = a.updated ? new Date(a.updated).getTime() : 0
				const bTime = b.updated ? new Date(b.updated).getTime() : 0
				return bTime - aTime
			})
			.slice(0, MAX_DEBUG_ITEMS)
	}, [jiraIssuesQuery.data])

	const totalWorklogEntries = worklogEntriesQuery.data?.summary.totalWorklogs ?? 0
	const totalRelevantIssues = jiraIssuesQuery.data?.summary.totalIssuesMatched ?? 0

	return (
		<div className='flex flex-col gap-6 grow bg-background'>
			<div className='flex flex-col gap-4'>
				<div>
					<h1 className='text-3xl font-bold'>Worklogs</h1>
					<p className='mt-1 text-sm text-muted-foreground'>
						Apply filters to view and manage Jira worklogs
					</p>
				</div>

				<div className='flex flex-col gap-6 pb-4 border-b'>
					<FilterSection
						title='Date range'
						description='Independent range shared by Jira worklogs and GitLab contributors.'
						dependencyHint='Standalone'
					>
						<DateRangeFilter
							value={state.dateRange}
							onChange={handleDateRangeChange}
						/>
					</FilterSection>

					<div className='flex flex-col xl:flex-row gap-6'>
						<div className='grow basis-2/5'>
							<FilterSection
								title='Jira'
								description='Pick projects first, then load users to pull worklogs.'
								dependencyHint='Projects -> Users'
							>
								{projectsQuery.isLoading ? (
									<Skeleton className='h-9 w-32 rounded-md' />
								) : projectsQuery.error ? (
									<ErrorPlaceholder
										message={`Projects error: ${
											projectsQuery.error instanceof Error
												? projectsQuery.error.message
												: 'Unknown error'
										}`}
									/>
								) : projectsQuery.data ? (
									<JiraProjects
										data={projectsQuery.data}
										value={state.selectedJiraProjectIds}
										onChange={handleJiraProjectIdsChange}
									/>
								) : null}

								{hasJiraProjectsSelected ? (
									usersQuery.isLoading ? (
										<Skeleton className='h-9 w-32 rounded-md' />
									) : usersQuery.error ? (
										<ErrorPlaceholder
											message={`Users error: ${
												usersQuery.error instanceof Error
													? usersQuery.error.message
													: 'Unknown error'
											}`}
										/>
									) : usersQuery.data ? (
										<Users
											data={usersQuery.data}
											value={state.selectedJiraUserIds}
											onChange={handleJiraUserIdsChange}
										/>
									) : null
								) : (
									<FilterDependencyMessage>
										Select Jira projects to load users
									</FilterDependencyMessage>
								)}
							</FilterSection>
						</div>

						<div className='grow basis-3/5'>
							<FilterSection
								title='GitLab'
								description='Contributors become available after selecting projects and a date range.'
								dependencyHint='Projects + Date range -> Contributors'
							>
								{gitlabProjectsQuery.isLoading ? (
									<Skeleton className='h-9 w-32 rounded-md' />
								) : gitlabProjectsQuery.error ? (
									<ErrorPlaceholder
										message={`GitLab projects error: ${
											gitlabProjectsQuery.error instanceof Error
												? gitlabProjectsQuery.error.message
												: 'Unknown error'
										}`}
									/>
								) : gitlabProjectsQuery.data ? (
									<GitlabProjects
										data={gitlabProjectsQuery.data}
										value={state.selectedGitlabProjectIds}
										onChange={handleGitlabProjectIdsChange}
									/>
								) : null}

								{hasGitlabProjectsSelected ? (
									hasCompleteDateRange ? (
										gitlabContributorsQuery.isLoading ? (
											<Skeleton className='h-9 w-48 rounded-md' />
										) : gitlabContributorsQuery.error ? (
											<ErrorPlaceholder
												message={`GitLab contributors error: ${
													gitlabContributorsQuery.error instanceof Error
														? gitlabContributorsQuery.error.message
														: 'Unknown error'
												}`}
											/>
										) : gitlabContributorsQuery.data ? (
											<GitlabContributors
												data={gitlabContributorsQuery.data}
												value={state.selectedGitlabContributorIds}
												onChange={handleGitlabContributorIdsChange}
											/>
										) : null
									) : (
										<FilterDependencyMessage>
											Select a date range to load contributors
										</FilterDependencyMessage>
									)
								) : (
									<FilterDependencyMessage>
										Select GitLab projects to load contributors
									</FilterDependencyMessage>
								)}
							</FilterSection>
						</div>
					</div>
				</div>
			</div>

			<div className='grid gap-4 xl:grid-cols-2'>
				<section className='flex flex-col gap-3 rounded-lg border bg-card/30 p-4 shadow-sm'>
					<div className='flex items-center justify-between gap-2'>
						<div>
							<p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
								Jira worklog entries
							</p>
							<p className='text-xs text-muted-foreground'>
								Preview of up to {MAX_DEBUG_ITEMS} worklogs for current filters
							</p>
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
						worklogEntriesQuery.isLoading ? (
							<div className='space-y-2'>
								<Skeleton className='h-20 w-full rounded-md' />
								<Skeleton className='h-20 w-full rounded-md' />
							</div>
						) : worklogEntriesQuery.error ? (
							<ErrorPlaceholder
								message={`Worklogs error: ${getErrorMessage(worklogEntriesQuery.error)}`}
								className='w-full'
							/>
						) : worklogDebugEntries.length === 0 ? (
							<p className='text-xs text-muted-foreground'>
								No worklog entries for the current filters.
							</p>
						) : (
							<>
								<div className='flex max-h-[24rem] flex-col gap-2 overflow-y-auto pr-1'>
									{worklogDebugEntries.map(entry => (
										<WorklogEntryDebugCard
											key={entry.id}
											entry={entry}
										/>
									))}
								</div>
								{totalWorklogEntries > worklogDebugEntries.length ? (
									<p className='text-[11px] text-muted-foreground'>
										Showing first {worklogDebugEntries.length} of {totalWorklogEntries} entries
									</p>
								) : null}
							</>
						)
					) : (
						<FilterDependencyMessage>
							Select Jira projects, users, and a date range to inspect worklog entries
						</FilterDependencyMessage>
					)}
				</section>

				<section className='flex flex-col gap-3 rounded-lg border bg-card/30 p-4 shadow-sm'>
					<div className='flex items-center justify-between gap-2'>
						<div>
							<p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
								Relevant Jira issues
							</p>
							<p className='text-xs text-muted-foreground'>
								Activity touching selected users within the date range
							</p>
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
						jiraIssuesQuery.isLoading ? (
							<div className='space-y-2'>
								<Skeleton className='h-20 w-full rounded-md' />
								<Skeleton className='h-20 w-full rounded-md' />
							</div>
						) : jiraIssuesQuery.error ? (
							<ErrorPlaceholder
								message={`Issues error: ${getErrorMessage(jiraIssuesQuery.error)}`}
								className='w-full'
							/>
						) : relevantIssueDebugEntries.length === 0 ? (
							<p className='text-xs text-muted-foreground'>
								No issues matched the current filters.
							</p>
						) : (
							<>
								<div className='flex max-h-[24rem] flex-col gap-2 overflow-y-auto pr-1'>
									{relevantIssueDebugEntries.map(issue => (
										<RelevantIssueDebugCard
											key={issue.id}
											issue={issue}
										/>
									))}
								</div>
								{totalRelevantIssues > relevantIssueDebugEntries.length ? (
									<p className='text-[11px] text-muted-foreground'>
										Showing first {relevantIssueDebugEntries.length} of {totalRelevantIssues} issues
									</p>
								) : null}
							</>
						)
					) : (
						<FilterDependencyMessage>
							Select Jira projects, users, and a date range to load relevant issues
						</FilterDependencyMessage>
					)}
				</section>
			</div>

			<div className='grow' />

			<CollapsibleDebugPanel
				title='Debug request payload'
				data={{
					state,
					worklogEntries: worklogEntriesQuery.data,
					relevantIssues: jiraIssuesQuery.data,
					gitlabProjects: gitlabProjectsQuery.data,
					gitlabContributors: gitlabContributorsQuery.data
				}}
			/>
		</div>
	)
}

interface ProjectsProps {
	data: Awaited<ReturnType<typeof jiraProjectsLoader>>

	value: string[]
	onChange: (value: string[]) => void
}

function JiraProjects({ data, value, onChange }: ProjectsProps): React.ReactNode {
	const projects = useMemo(() => {
		const projects = data.resources.flatMap(resource => data.byResource[resource.id] ?? [])
		return Object.fromEntries(projects.map(project => [project.id, project]))
	}, [data])

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					role='combobox'
				>
					<SiAtlassian
						aria-hidden
						color={SiAtlassianHex}
					/>
					Jira projects
					{value?.length > 0 && (
						<>
							<Separator
								orientation='vertical'
								className='mx-1 h-4'
							/>
							<Badge
								variant='secondary'
								className='rounded-sm px-1 font-normal lg:hidden'
							>
								{value.length}
							</Badge>
							<div className='hidden space-x-1 lg:flex'>
								{value.length > 2 ? (
									<Badge
										variant='secondary'
										className='rounded-sm px-1 font-normal'
									>
										{value.length} selected
									</Badge>
								) : (
									value.map(id => {
										return (
											<Badge
												variant='secondary'
												key={id}
												className='rounded-sm px-1 font-normal'
											>
												{projects[id]?.name ?? 'Unknown project'}
											</Badge>
										)
									})
								)}
							</div>
						</>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className='p-0'
				align='start'
			>
				<Command>
					<CommandInput
						placeholder='Search projects...'
						className='h-9'
					/>
					<CommandList>
						<CommandEmpty>No projects found.</CommandEmpty>

						{data.resources.map(resource => {
							const resourceProjects = data.byResource[resource.id] ?? []
							if (resourceProjects.length === 0) {
								return null
							}

							return (
								<CommandGroup
									key={resource.id}
									heading={
										<div className='flex items-center gap-2'>
											{resource.avatarUrl ? (
												<img
													src={resource.avatarUrl}
													alt={`${resource.name} avatar`}
													className='h-4 w-4 rounded-sm'
												/>
											) : null}

											<span>{resource.name}</span>
										</div>
									}
								>
									{resourceProjects.map(project => (
										<CommandItem
											key={project.id}
											value={project.id}
											onSelect={id => {
												const next = value.includes(id)
													? value.filter(v => v !== id)
													: [...value, id]
												onChange(next)
											}}
										>
											{project.avatarUrls?.['48x48'] ? (
												<img
													src={project.avatarUrls['48x48']}
													alt={`${project.name} avatar`}
													className='h-6 w-6 rounded-sm'
												/>
											) : null}

											<div className='flex flex-col text-left'>
												<span className='text-sm font-medium'>{project.name}</span>
												<span className='text-xs text-muted-foreground'>{project.key}</span>
											</div>
											<Check
												className={cn('ml-auto h-4 w-4', {
													'opacity-0': !value.includes(project.id),
													'opacity-100': value.includes(project.id)
												})}
											/>
										</CommandItem>
									))}
								</CommandGroup>
							)
						})}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}

interface UsersProps {
	data: Awaited<ReturnType<typeof jiraUsersLoader>>

	value: string[]
	onChange: (value: string[]) => void
}

function Users({ data, value, onChange }: UsersProps): React.ReactNode {
	const users = useMemo(() => {
		const users = data.users.filter(user => user.active ?? false)
		return Object.fromEntries(users.map(user => [user.accountId, user]))
	}, [data])

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					role='combobox'
				>
					<UsersIcon />
					Users
					{value?.length > 0 && (
						<>
							<Separator
								orientation='vertical'
								className='mx-1 h-4'
							/>
							<Badge
								variant='secondary'
								className='rounded-sm px-1 font-normal lg:hidden'
							>
								{value.length}
							</Badge>
							<div className='hidden space-x-1 lg:flex'>
								{value.length > 2 ? (
									<Badge
										variant='secondary'
										className='rounded-sm px-1 font-normal'
									>
										{value.length} selected
									</Badge>
								) : (
									value.map(id => {
										return (
											<Badge
												variant='secondary'
												key={id}
												className='rounded-sm px-1 font-normal'
											>
												{users[id]?.displayName ?? 'Unknown user'}
											</Badge>
										)
									})
								)}
							</div>
						</>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className='p-0'
				align='start'
			>
				<Command>
					<CommandInput
						placeholder='Search users...'
						className='h-9'
					/>
					<CommandList>
						<CommandEmpty>No users found.</CommandEmpty>

						<CommandGroup>
							{data.users.map(user => (
								<CommandItem
									key={user.accountId}
									value={user.accountId}
									onSelect={id => {
										const next = value.includes(id) ? value.filter(v => v !== id) : [...value, id]
										onChange(next)
									}}
								>
									{user.avatarUrls?.['48x48'] ? (
										<img
											src={user.avatarUrls['48x48']}
											alt={`${user.displayName} avatar`}
											className='h-6 w-6 rounded-sm'
										/>
									) : null}

									<span className='flex flex-col text-left'>
										<span className='text-sm font-medium'>{user.displayName}</span>

										{typeof user.emailAddress === 'string' && (
											<span className='text-xs text-muted-foreground'>{user.emailAddress}</span>
										)}
									</span>
									<Check
										className={cn('ml-auto h-4 w-4', {
											'opacity-0': !value.includes(user.accountId),
											'opacity-100': value.includes(user.accountId)
										})}
									/>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}

interface GitlabProjectsProps {
	data: Awaited<ReturnType<typeof gitlabProjectsLoader>>

	value: string[]
	onChange: (value: string[]) => void
}

function GitlabProjects({ data, value, onChange }: GitlabProjectsProps): React.ReactNode {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					role='combobox'
				>
					<SiGitlab color={SiGitlabHex} />
					GitLab projects
					{value?.length > 0 && (
						<>
							<Separator
								orientation='vertical'
								className='mx-1 h-4'
							/>
							<Badge
								variant='secondary'
								className='rounded-sm px-1 font-normal lg:hidden'
							>
								{value.length}
							</Badge>
							<div className='hidden space-x-1 lg:flex'>
								{value.length > 2 ? (
									<Badge
										variant='secondary'
										className='rounded-sm px-1 font-normal'
									>
										{value.length} selected
									</Badge>
								) : (
									value.map(id => {
										const project = data.projects.find(project => String(project.id) === id)
										return (
											<Badge
												variant='secondary'
												className='rounded-sm px-1 font-normal'
												key={id}
											>
												{project?.name_with_namespace ?? project?.path_with_namespace ?? 'Project'}
											</Badge>
										)
									})
								)}
							</div>
						</>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className='p-0'
				align='start'
			>
				<Command>
					<CommandInput
						placeholder='Search GitLab projects...'
						className='h-9'
					/>
					<CommandList>
						<CommandEmpty>No GitLab projects found.</CommandEmpty>

						<CommandGroup>
							{data.projects.map(project => (
								<CommandItem
									key={project.id}
									value={String(project.id)}
									onSelect={id => {
										const next = value.includes(id)
											? value.filter(item => item !== id)
											: [...value, id]
										onChange(next)
									}}
								>
									<div className='flex flex-col text-left'>
										<span className='text-sm font-medium'>{project.name}</span>
										<span className='text-xs text-muted-foreground'>
											{project.path_with_namespace}
										</span>
									</div>
									<Check
										className={cn('ml-auto h-4 w-4', {
											'opacity-0': !value.includes(String(project.id)),
											'opacity-100': value.includes(String(project.id))
										})}
									/>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}

interface GitlabContributorsProps {
	data: Awaited<ReturnType<typeof gitlabContributorsLoader>>

	value: string[]
	onChange: (value: string[]) => void
}

function GitlabContributors({ data, value, onChange }: GitlabContributorsProps): React.ReactNode {
	const contributors = data.contributors

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					role='combobox'
				>
					<UsersIcon />
					GitLab contributors
					{value?.length > 0 && (
						<>
							<Separator
								orientation='vertical'
								className='mx-1 h-4'
							/>
							<Badge
								variant='secondary'
								className='rounded-sm px-1 font-normal lg:hidden'
							>
								{value.length}
							</Badge>
							<div className='hidden space-x-1 lg:flex'>
								{value.length > 2 ? (
									<Badge
										variant='secondary'
										className='rounded-sm px-1 font-normal'
									>
										{value.length} selected
									</Badge>
								) : (
									value.map(id => {
										const contributor = contributors.find(item => item.id === id)
										return (
											<Badge
												variant='secondary'
												className='rounded-sm px-1 font-normal'
												key={id}
											>
												{contributor?.name ?? contributor?.email ?? 'Contributor'}
											</Badge>
										)
									})
								)}
							</div>
						</>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className='p-0'
				align='start'
			>
				<Command>
					<CommandInput
						placeholder='Search contributors...'
						className='h-9'
					/>
					<CommandList>
						<CommandEmpty>No contributors found.</CommandEmpty>

						<CommandGroup>
							{contributors.map(contributor => (
								<CommandItem
									key={contributor.id}
									value={contributor.id}
									onSelect={id => {
										const next = value.includes(id)
											? value.filter(item => item !== id)
											: [...value, id]
										onChange(next)
									}}
								>
									<div className='flex flex-col text-left'>
										<span className='text-sm font-medium'>
											{contributor.name ?? contributor.email ?? 'Unknown contributor'}
										</span>
										<span className='text-xs text-muted-foreground'>
											{contributor.email ?? 'No email available'}
										</span>
									</div>
									<div
										className='ml-auto text-xs text-muted-foreground line-clamp-1 shrink-0 font-mono'
										title={`${contributor.commitCount} commits`}
									>
										{contributor.commitCount}
									</div>
									<Check
										className={cn('ml-2 h-4 w-4', {
											'opacity-0': !value.includes(contributor.id),
											'opacity-100': value.includes(contributor.id)
										})}
									/>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}

interface WorklogDebugEntry {
	id: string
	issueKey: string
	summary: string
	projectName: string
	authorName: string
	started?: string
	timeSpentSeconds: number
}

function WorklogEntryDebugCard({ entry }: { entry: WorklogDebugEntry }): React.ReactNode {
	return (
		<article className='rounded-md border bg-background px-3 py-2 shadow-sm'>
			<div className='flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
				<span>{entry.issueKey}</span>
				<span>{formatDurationFromSeconds(entry.timeSpentSeconds)}</span>
			</div>
			<p className='text-sm font-medium text-foreground'>{entry.summary}</p>
			<p className='text-xs text-muted-foreground'>{entry.projectName}</p>
			<div className='flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground'>
				<span>{entry.authorName}</span>
				<span>•</span>
				<span>{formatDateTimeLabel(entry.started)}</span>
			</div>
		</article>
	)
}

interface RelevantIssueDebugEntry {
	id: string
	key: string
	summary: string
	projectName: string
	status: string
	assignee: string
	updated?: string
	created?: string
}

function RelevantIssueDebugCard({ issue }: { issue: RelevantIssueDebugEntry }): React.ReactNode {
	return (
		<article className='rounded-md border bg-background px-3 py-2 shadow-sm'>
			<div className='flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
				<span>{issue.key}</span>
				<span>{issue.status}</span>
			</div>
			<p className='text-sm font-medium text-foreground'>{issue.summary}</p>
			<p className='text-xs text-muted-foreground'>{issue.projectName}</p>
			<div className='flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground'>
				<span>{issue.assignee}</span>
				<span>•</span>
				<span>{formatDateTimeLabel(issue.updated ?? issue.created)}</span>
			</div>
		</article>
	)
}

function formatDurationFromSeconds(seconds?: number) {
	if (!seconds || Number.isNaN(seconds)) {
		return '0m'
	}

	const minutesTotal = Math.max(1, Math.round(seconds / 60))
	if (minutesTotal < 60) {
		return `${minutesTotal}m`
	}

	const hours = Math.floor(minutesTotal / 60)
	const minutes = minutesTotal % 60

	if (minutes === 0) {
		return `${hours}h`
	}

	return `${hours}h ${minutes}m`
}

function formatDateTimeLabel(value?: string) {
	if (!value) {
		return 'Unknown date'
	}

	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return value
	}

	try {
		return format(date, 'PP p')
	} catch {
		return date.toISOString()
	}
}

function getErrorMessage(error: unknown) {
	if (error instanceof Error) {
		return error.message
	}

	if (typeof error === 'string') {
		return error
	}

	return 'Unknown error'
}

interface DateRangeFilterProps {
	value?: DateRange
	onChange: (value: DateRange | undefined) => void
}

function DateRangeFilter({ value, onChange }: DateRangeFilterProps): React.ReactNode {
	const label = useMemo(() => {
		if (value?.from && value?.to) {
			return `${format(value.from, 'MMM d, yyyy')} – ${format(value.to, 'MMM d, yyyy')}`
		}

		if (value?.from) {
			return `${format(value.from, 'MMM d, yyyy')} – …`
		}

		return 'Select date range'
	}, [value])

	const defaultMonth = value?.from ?? value?.to ?? new Date()

	const handleSelect = useCallback(
		(nextValue: DateRange | undefined) => {
			onChange(nextValue)
		},
		[onChange]
	)

	const handlePreset = useCallback(
		(preset: 'this-month' | 'previous-month') => {
			const baseDate = preset === 'this-month' ? new Date() : subMonths(new Date(), 1)
			const from = startOfMonth(baseDate)
			const to = endOfMonth(baseDate)

			onChange({
				from,
				to
			})
		},
		[onChange]
	)

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					className='flex min-w-[240px] items-center justify-between gap-2 font-normal'
				>
					<span className='flex items-center gap-2'>
						<CalendarDays
							className='h-4 w-4'
							aria-hidden
						/>
						<span
							className={cn('text-sm', {
								'text-muted-foreground': !value?.from
							})}
						>
							{label}
						</span>
					</span>
					<ChevronDown
						className='h-4 w-4 opacity-60'
						aria-hidden
					/>
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className='w-auto p-0'
				align='start'
			>
				<div className='flex flex-col gap-3 p-3'>
					<Calendar
						mode='range'
						numberOfMonths={2}
						defaultMonth={defaultMonth}
						selected={value}
						onSelect={handleSelect}
						initialFocus
						className='rounded-lg border'
					/>

					<div className='flex flex-col gap-2 border-t pt-3'>
						<span className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
							Presets
						</span>
						<div className='flex flex-wrap gap-2'>
							<Button
								type='button'
								variant='outline'
								size='sm'
								className='flex-1'
								onClick={() => {
									handlePreset('this-month')
								}}
							>
								This month
							</Button>
							<Button
								type='button'
								variant='outline'
								size='sm'
								className='flex-1'
								onClick={() => {
									handlePreset('previous-month')
								}}
							>
								Previous month
							</Button>
						</div>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	)
}

type InferQueryKeyParams<T> = T extends Array<string | infer U> ? [string, U] : never

export async function loader({ request }: Route.LoaderArgs) {
	const session = await getSession(request.headers.get('Cookie'))
	const user = session.get('user')

	if (!user?.atlassian?.id) {
		throw new Error('Atlassian profile ID not found. Please sign in.')
	}

	const em = orm.em.fork()
	const token = await em.findOne(Token, {
		profileId: user.atlassian.id,
		provider: 'atlassian'
	})

	if (!token?.accessToken) {
		throw new Error('Atlassian access token not found. Please reconnect your account.')
	}

	return {
		user
	}
}
