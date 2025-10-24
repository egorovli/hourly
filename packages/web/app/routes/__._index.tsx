import type { Route } from './+types/__._index.ts'

import type { loader as jiraProjectsLoader } from './jira.projects.tsx'
import type { loader as jiraUsersLoader } from './jira.users.tsx'
import type { loader as jiraWorklogEntriesLoader } from './jira.worklog.entries.tsx'

import { useQuery } from '@tanstack/react-query'
import { Check, FileBoxIcon, UsersIcon, CalendarDays, ChevronDown } from 'lucide-react'
import { useCallback, useMemo, useReducer } from 'react'
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import type { DateRange } from 'react-day-picker'

import { Button } from '~/components/shadcn/ui/button.tsx'
import { Calendar } from '~/components/shadcn/ui/calendar.tsx'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/shadcn/ui/popover.tsx'
import { Skeleton } from '~/components/shadcn/ui/skeleton.tsx'
import { CollapsibleDebugPanel } from '~/components/worklogs/collapsible-debug-panel.tsx'
import { orm, Token } from '~/lib/mikro-orm/index.ts'
import { getSession } from '~/lib/session/storage.ts'
import { cn, invariant } from '~/lib/util/index.ts'

import { Badge } from '~/components/shadcn/ui/badge.tsx'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from '~/components/shadcn/ui/command.tsx'
import { Separator } from '~/components/shadcn/ui/separator.tsx'

interface State {
	selectedJiraProjectIds: string[]
	selectedJiraUserIds: string[]
	dateRange: DateRange | null
}

type Action =
	| { type: 'selectedJiraProjectIds.select'; payload: string[] }
	| { type: 'selectedJiraUserIds.select'; payload: string[] }
	| { type: 'dateRange.select'; payload: DateRange | null }

function reducer(state: State, action: Action): State {
	switch (action.type) {
		case 'selectedJiraProjectIds.select':
			return {
				...state,
				selectedJiraProjectIds: action.payload,
				selectedJiraUserIds: [],
				dateRange: null
			}

		case 'selectedJiraUserIds.select': {
			const shouldResetDateRange = action.payload.length === 0

			return {
				...state,
				selectedJiraUserIds: action.payload,
				dateRange: shouldResetDateRange ? null : state.dateRange
			}
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
	dateRange: null
}

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

export default function WorklogsPage({ loaderData }: Route.ComponentProps) {
	// const projectsFetcher = useFetcher()
	invariant(loaderData.user?.atlassian?.id, 'Atlassian profile ID is required in loader data')

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
							from: state.dateRange.from?.toISOString() ?? null,
							to: state.dateRange.to?.toISOString() ?? null
						}
					: null
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

	const handleJiraProjectIdsChange = useCallback((value: string[]) => {
		dispatch({ type: 'selectedJiraProjectIds.select', payload: value })
	}, [])

	const handleJiraUserIdsChange = useCallback((value: string[]) => {
		dispatch({ type: 'selectedJiraUserIds.select', payload: value })
	}, [])

	const handleDateRangeChange = useCallback((value: DateRange | null) => {
		dispatch({ type: 'dateRange.select', payload: value })
	}, [])

	return (
		<div className='flex flex-col gap-6 grow bg-background'>
			<div className='flex flex-col gap-4'>
				<div>
					<h1 className='text-3xl font-bold'>Worklogs</h1>
					<p className='mt-1 text-sm text-muted-foreground'>
						Apply filters to view and manage Jira worklogs
					</p>
				</div>

				<div className='flex flex-wrap items-center gap-3 py-2 pb-4 border-b'>
					{projectsQuery.isLoading ? (
						<Skeleton className='h-9 w-32 rounded-md' />
					) : projectsQuery.error ? (
						<ErrorPlaceholder
							message={`Projects error: ${
								projectsQuery.error instanceof Error ? projectsQuery.error.message : 'Unknown error'
							}`}
						/>
					) : projectsQuery.data ? (
						<Projects
							data={projectsQuery.data}
							value={state.selectedJiraProjectIds}
							onChange={handleJiraProjectIdsChange}
						/>
					) : null}

					{usersQuery.isLoading ? (
						<Skeleton className='h-9 w-32 rounded-md' />
					) : usersQuery.error ? (
						<ErrorPlaceholder
							message={`Users error: ${
								usersQuery.error instanceof Error ? usersQuery.error.message : 'Unknown error'
							}`}
						/>
					) : usersQuery.data ? (
						<Users
							data={usersQuery.data}
							value={state.selectedJiraUserIds}
							onChange={handleJiraUserIdsChange}
						/>
					) : null}

					{state.selectedJiraUserIds.length > 0 ? (
						<DateRangeFilter
							value={state.dateRange}
							onChange={handleDateRangeChange}
						/>
					) : null}
				</div>
			</div>

			<div className='grow' />

			<CollapsibleDebugPanel
				title='Debug request payload'
				data={{
					state,
					worklogEntries: worklogEntriesQuery.data ?? null
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

function Projects({ data, value, onChange }: ProjectsProps): React.ReactNode {
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
					<FileBoxIcon />
					Projects
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

interface DateRangeFilterProps {
	value: DateRange | null
	onChange: (value: DateRange | null) => void
}

function DateRangeFilter({ value, onChange }: DateRangeFilterProps): React.ReactNode {
	const range = value ?? undefined

	const label = useMemo(() => {
		if (value?.from && value?.to) {
			return `${format(value.from, 'MMM d, yyyy')} – ${format(value.to, 'MMM d, yyyy')}`
		}

		if (value?.from) {
			return `${format(value.from, 'MMM d, yyyy')} – …`
		}

		return 'Select date range'
	}, [value])

	const defaultMonth = range?.from ?? range?.to ?? new Date()

	const handleSelect = useCallback(
		(nextValue: DateRange | undefined) => {
			onChange(nextValue ?? null)
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
						selected={range}
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
