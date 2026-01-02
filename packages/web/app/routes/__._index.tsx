import type {
	DatesSetArg,
	EventContentArg,
	EventDropArg,
	EventInput,
	FormatterInput,
	PluginDef
} from '@fullcalendar/core'

import type { Draggable, EventReceiveArg, EventResizeDoneArg } from '@fullcalendar/interaction'
import type FullCalendarType from '@fullcalendar/react'
import type { MetaDescriptor } from 'react-router'
import type { AccessibleResource, JiraUser, Project, WorklogEntry } from '~/lib/atlassian/index.ts'
import type { Route } from './+types/__._index.ts'
import type { Route as LayoutRoute } from './+types/__.ts'
import type { SaveWorklogsActionResponse } from './api.worklog.entries.tsx'

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouteLoaderData } from 'react-router'
import { toast } from 'sonner'
import { Virtuoso } from 'react-virtuoso'
import { nanoid } from 'nanoid'

import {
	BugIcon,
	CheckCircle2Icon,
	ChevronDownIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	CircleDashedIcon,
	CircleIcon,
	ClockIcon,
	EyeIcon,
	LayersIcon,
	LightbulbIcon,
	Loader2Icon,
	PencilIcon,
	RocketIcon,
	SaveIcon,
	SearchIcon,
	SignalHighIcon,
	SignalLowIcon,
	SignalMediumIcon,
	SlidersHorizontalIcon,
	SparklesIcon,
	XIcon,
	ZapIcon
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '~/components/shadcn/ui/avatar.tsx'
import { Badge } from '~/components/shadcn/ui/badge.tsx'
import { Button } from '~/components/shadcn/ui/button.tsx'
import { Checkbox } from '~/components/shadcn/ui/checkbox.tsx'
import { Input } from '~/components/shadcn/ui/input.tsx'
import { Label } from '~/components/shadcn/ui/label.tsx'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/shadcn/ui/popover.tsx'
import { ScrollArea } from '~/components/shadcn/ui/scroll-area.tsx'
import { Skeleton } from '~/components/shadcn/ui/skeleton.tsx'
import { Spinner } from '~/components/shadcn/ui/spinner.tsx'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/shadcn/ui/tooltip.tsx'
import { getQueryKeyParams } from '~/lib/query/get-query-key-params.ts'
import { cn, invariant } from '~/lib/util/index.ts'

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from '~/components/shadcn/ui/collapsible.tsx'

import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from '~/components/shadcn/ui/command.tsx'

const FullCalendar = lazy(() => import('@fullcalendar/react'))

enum IssueType {
	Bug = 'bug',
	Feature = 'feature',
	Task = 'task',
	SubTask = 'subtask',
	Story = 'story'
}

enum IssueStatus {
	Open = 'open',
	Closed = 'closed',
	InProgress = 'in-progress',
	Done = 'done',
	Backlog = 'backlog',
	Review = 'review',
	Deployed = 'deployed'
}

enum IssuePriority {
	Low = 'low',
	Medium = 'medium',
	High = 'high',
	Critical = 'critical'
}

interface Issue {
	id: string
	type: IssueType
	status: IssueStatus
	priority: IssuePriority
	name: string
	description?: string
	author: Person
	assignees: Person[]
}

interface Person {
	id: string
	name: string
	email: string
	initials: string
	avatarUrl?: string
}

interface User {
	id: string
	name: string
	email?: string
	avatarUrl?: string
}

interface ProjectsByResource {
	resource: AccessibleResource
	projects: Project[]
}

interface ProjectOption {
	value: string
	resource: AccessibleResource
	project: Project
}

const PROJECT_AVATAR_SIZE = '32x32'

function getProjectAvatarUrl(project: Project): string | undefined {
	const preferredOrder = [PROJECT_AVATAR_SIZE, '48x48', '24x24', '16x16']

	for (const size of preferredOrder) {
		if (project.avatarUrls?.[size]) {
			return project.avatarUrls[size]
		}
	}

	const [firstAvatar] = Object.values(project.avatarUrls ?? {})
	return firstAvatar
}

function getInitialsFromLabel(label: string): string {
	return label
		.split(' ')
		.map(part => part[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
}

function hashStringToHue(value: string): number {
	let hash = 0

	for (let index = 0; index < value.length; index += 1) {
		hash = (hash << 5) - hash + value.charCodeAt(index)
		hash |= 0
	}

	return Math.abs(hash) % 360
}

function getProjectKeyFromIssueKey(issueKey: string): string | undefined {
	const [projectKey] = issueKey.split('-')
	return typeof projectKey === 'string' && projectKey.length > 0 ? projectKey : undefined
}

function getWorklogColors(authorId: string | undefined, projectKey: string | undefined) {
	const key = `${authorId ?? 'unknown'}:${projectKey ?? 'unknown'}`
	const hue = hashStringToHue(key)

	return {
		backgroundColor: `hsla(${hue}, 35%, 85%, 0.5)`,
		borderColor: `hsla(${hue}, 40%, 70%, 0.75)`
	}
}

const dayHeaderFormat: FormatterInput = {
	month: 'short',
	day: '2-digit',
	weekday: 'short'
}

interface CalendarEvent extends EventInput {}

/**
 * Represents a pending change to an event (create, update, or delete).
 * Used to track user modifications before they are saved to the API.
 */
type PendingChangeType = 'create' | 'update' | 'delete'

interface PendingChange {
	type: PendingChangeType
	event: CalendarEvent
	originalEvent?: CalendarEvent
}

/**
 * Represents a worklog entry to be saved via the API.
 * Used when submitting pending changes to the server.
 */
interface WorklogSaveEntry {
	worklogId?: string
	issueIdOrKey: string
	accessibleResourceId: string
	timeSpentSeconds: number
	started: string
	comment?: string
}

// function renderWorklogEventContent(eventInfo: EventContentArg): React.ReactNode {
// 	const author = eventInfo.event.extendedProps['authorDisplayName'] as string | undefined

// 	return (
// 		<div className='flex flex-col gap-1'>
// 			<div className='flex items-center gap-2 text-[11px] leading-tight'>
// 				<span className='rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-semibold text-foreground shadow-xs'>
// 					{eventInfo.timeText}
// 				</span>
// 				<span className='truncate text-[11px] font-semibold text-foreground'>
// 					{eventInfo.event.title}
// 				</span>
// 			</div>
// 			{author ? (
// 				<div className='flex items-center gap-2 text-[10px] text-muted-foreground'>
// 					<span className='flex size-4 items-center justify-center rounded-full bg-background/70 text-[9px] font-semibold text-foreground shadow-xs'>
// 						{getInitialsFromLabel(author)}
// 					</span>
// 					<span className='truncate'>{author}</span>
// 				</div>
// 			) : null}
// 		</div>
// 	)
// }

const fakeIssues: Issue[] = [
	{
		id: 'LP-123',
		type: IssueType.Bug,
		status: IssueStatus.InProgress,
		priority: IssuePriority.Critical,
		name: 'Issue 1',
		// description:
		// 	'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',

		author: {
			id: '1',
			name: 'John Doe',
			email: 'john.doe@example.com',
			initials: 'JD'
		},
		assignees: [
			{
				id: '2',
				name: 'Jane Doe',
				email: 'jane.doe@example.com',
				initials: 'JD'
			},
			{
				id: '3',
				name: 'Jim Doe',
				email: 'jim.doe@example.com',
				initials: 'JD'
			}
		]
	},

	{
		id: 'LP-124',
		type: IssueType.Feature,
		status: IssueStatus.Open,
		priority: IssuePriority.Low,
		name: 'Issue 2',
		description:
			'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
		author: {
			id: '1',
			name: 'John Doe',
			email: 'john.doe@example.com',
			initials: 'JD'
		},
		assignees: [
			{
				id: '2',
				name: 'Jane Doe',
				email: 'jane.doe@example.com',
				initials: 'JD'
			},
			{
				id: '3',
				name: 'Jim Doe',
				email: 'jim.doe@example.com',
				initials: 'JD'
			}
		]
	}
]

// const fakeUsers: User[] = [
// 	{
// 		id: '1',
// 		name: 'Alice Johnson',
// 		email: 'alice.johnson@example.com',
// 		avatarUrl: undefined
// 	},
// 	{
// 		id: '2',
// 		name: 'Bob Smith',
// 		email: 'bob.smith@example.com',
// 		avatarUrl: undefined
// 	},
// 	{
// 		id: '3',
// 		name: 'Charlie Brown',
// 		email: undefined,
// 		avatarUrl: undefined
// 	},
// 	{
// 		id: '4',
// 		name: 'Diana Prince',
// 		email: 'diana.prince@example.com',
// 		avatarUrl: undefined
// 	},
// 	{
// 		id: '5',
// 		name: 'Eve Wilson',
// 		email: undefined,
// 		avatarUrl: undefined
// 	},
// 	{
// 		id: '6',
// 		name: 'Frank Miller',
// 		email: 'frank.miller@example.com',
// 		avatarUrl: undefined
// 	}
// ]

const ONE_WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000

function UsersFilter({
	users,
	isLoading,
	isQueryEnabled,
	value,
	onChange
}: {
	users: JiraUser[]
	isLoading: boolean
	isQueryEnabled: boolean
	value: string[]
	onChange: (value: string[]) => void
}): React.ReactNode {
	const [open, setOpen] = useState(false)

	const selectedUsers = users.filter(user => value.includes(user.accountId))
	const selectedPreview = selectedUsers.slice(0, 2)

	function toggleValue(userId: string): void {
		onChange(
			value.includes(userId) ? value.filter(current => current !== userId) : [...value, userId]
		)
	}

	const firstSelected = selectedUsers[0]
	const isEmpty = !isLoading && users.length === 0
	// Disable if loading, empty, or query is not enabled (no projects selected)
	const isDisabled = isLoading || isEmpty || !isQueryEnabled

	let summary = 'Select users'

	if (!isQueryEnabled) {
		summary = 'Select projects first'
	} else if (isLoading) {
		summary = 'Loading users...'
	} else if (isEmpty) {
		summary = 'No users available'
	} else if (selectedUsers.length === 1 && firstSelected) {
		summary = firstSelected.displayName
	} else if (selectedUsers.length > 1) {
		summary = `${selectedUsers.length} users`
	}

	return (
		<div className='space-y-2'>
			<Label htmlFor='filter-users'>Users</Label>
			<Popover
				open={open}
				onOpenChange={setOpen}
			>
				<PopoverTrigger asChild>
					<Button
						id='filter-users'
						variant='outline'
						role='combobox'
						aria-expanded={open}
						className='group h-10 w-full justify-between border-border/50 bg-background px-3 text-left shadow-sm transition-all hover:border-border hover:shadow-xs data-[state=open]:border-border data-[state=open]:shadow-xs disabled:opacity-50 disabled:cursor-not-allowed'
						disabled={isDisabled}
					>
						<div className='flex min-w-0 flex-1 items-center gap-2.5'>
							{isLoading ? (
								<>
									<Skeleton className='size-6 rounded-full' />
									<Skeleton className='h-4 flex-1 max-w-[140px]' />
									<Spinner
										className='ml-auto size-4 shrink-0 text-muted-foreground'
										aria-label='Loading users'
									/>
								</>
							) : isEmpty ? (
								<span className='text-sm text-muted-foreground'>{summary}</span>
							) : selectedUsers.length > 0 ? (
								<>
									<div className='flex -space-x-1.5'>
										{selectedPreview.map(user => (
											<Avatar
												key={user.accountId}
												className='size-6 border-2 border-background shadow-xs ring-1 ring-border/20'
											>
												{user.avatarUrls?.[PROJECT_AVATAR_SIZE] && (
													<AvatarImage
														src={user.avatarUrls[PROJECT_AVATAR_SIZE]}
														alt={user.name}
													/>
												)}
												<AvatarFallback className='text-[10px] font-semibold'>
													{getInitialsFromLabel(user.displayName)}
												</AvatarFallback>
											</Avatar>
										))}
									</div>
									<span className='truncate text-sm font-medium'>{summary}</span>
									{selectedUsers.length > selectedPreview.length && (
										<Badge
											variant='secondary'
											className='ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium'
										>
											+{selectedUsers.length - selectedPreview.length}
										</Badge>
									)}
								</>
							) : (
								<span className='text-sm text-muted-foreground'>{summary}</span>
							)}
						</div>
						<ChevronDownIcon className='ml-2 size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180' />
					</Button>
				</PopoverTrigger>
				<PopoverContent
					align='start'
					className='w-[440px] p-0'
				>
					<Command className='rounded-lg'>
						<CommandInput
							placeholder='Search users...'
							className='h-11 border-0'
							disabled={isLoading || isEmpty}
						/>
						<CommandList>
							{isLoading ? null : isEmpty ? (
								<div className='flex flex-col items-center justify-center py-12 px-4 text-center'>
									<div className='mb-3 flex size-12 items-center justify-center rounded-full bg-muted'>
										<CircleIcon
											className='size-6 text-muted-foreground'
											aria-hidden='true'
										/>
									</div>
									<p className='mb-1 text-sm font-medium text-foreground'>
										{isQueryEnabled ? 'No users available' : 'Select projects first'}
									</p>
									<p className='text-xs text-muted-foreground'>
										{isQueryEnabled
											? 'Users will appear here once projects are selected'
											: 'Select at least one project to load users'}
									</p>
								</div>
							) : (
								<>
									<CommandEmpty className='py-8 text-sm text-muted-foreground'>
										No users found
									</CommandEmpty>
									<ScrollArea className='max-h-[320px]'>
										<div className='p-2'>
											<CommandGroup className='p-0'>
												<div className='space-y-0.5'>
													{users.map(user => {
														const checked = value.includes(user.accountId)

														return (
															<CommandItem
																key={user.accountId}
																value={`${user.displayName} ${user.emailAddress ?? ''}`}
																onSelect={() => {
																	toggleValue(user.accountId)
																}}
																className='group/item relative flex items-center gap-3 rounded-md px-2.5 py-2.5 text-sm outline-hidden transition-colors data-[selected=true]:bg-accent/50 data-[selected=true]:text-accent-foreground hover:bg-accent/30'
															>
																<Checkbox
																	checked={checked}
																	className='pointer-events-none shrink-0'
																/>
																<Avatar className='size-8 shrink-0 border border-border/40 shadow-xs ring-1 ring-border/20'>
																	{user.avatarUrls?.[PROJECT_AVATAR_SIZE] && (
																		<AvatarImage
																			src={user.avatarUrls[PROJECT_AVATAR_SIZE]}
																			alt={user.displayName}
																		/>
																	)}
																	<AvatarFallback className='text-[11px] font-semibold'>
																		{getInitialsFromLabel(user.displayName)}
																	</AvatarFallback>
																</Avatar>
																<div className='flex min-w-0 flex-1 flex-col gap-0.5'>
																	<span className='truncate text-sm font-medium leading-tight'>
																		{user.displayName}
																	</span>
																	{user.emailAddress && (
																		<span className='truncate text-xs text-muted-foreground'>
																			{user.emailAddress}
																		</span>
																	)}
																</div>
															</CommandItem>
														)
													})}
												</div>
											</CommandGroup>
										</div>
									</ScrollArea>
								</>
							)}
						</CommandList>
						{!isLoading && !isEmpty && (
							<div
								className={cn(
									'overflow-hidden border-t border-border/50 bg-muted/30 transition-all duration-200',
									selectedUsers.length > 0 ? 'max-h-12 opacity-100' : 'max-h-0 border-0 opacity-0'
								)}
							>
								<div className='flex items-center justify-between px-3 py-2'>
									<span className='text-xs font-medium text-muted-foreground'>
										{selectedUsers.length} {selectedUsers.length === 1 ? 'user' : 'users'} selected
									</span>
									<Button
										type='button'
										variant='ghost'
										size='sm'
										className='h-7 px-2 text-xs font-medium'
										onClick={() => {
											onChange([])
										}}
									>
										Clear all
									</Button>
								</div>
							</div>
						)}
					</Command>
				</PopoverContent>
			</Popover>
		</div>
	)
}

function ProjectsFilter({
	projects,
	accessibleResources,
	isLoading,
	resourcesLoaded,
	value,
	onChange
}: {
	projects: Project[]
	accessibleResources: AccessibleResource[]
	isLoading: boolean
	resourcesLoaded: boolean
	value: string[]
	onChange: (value: string[]) => void
}): React.ReactNode {
	const [open, setOpen] = useState(false)

	// Group projects by resource by matching domains
	const projectGroups = useMemo<ProjectsByResource[]>(() => {
		const groups = new Map<string, ProjectsByResource>()

		// Initialize groups for all resources
		for (const resource of accessibleResources) {
			groups.set(resource.id, {
				resource,
				projects: []
			})
		}

		// Match projects to resources by extracting resource ID from project's self URL
		// Project self URL format: https://api.atlassian.com/ex/jira/{resourceId}/rest/api/3/project/{projectId}
		for (const project of projects) {
			if (project.archived ?? false) {
				continue
			}

			// Extract resource ID from project's self URL
			let projectResourceId: string | undefined
			try {
				const projectUrl = new URL(project.self)
				// Extract resource ID from path: /ex/jira/{resourceId}/rest/api/3/project/{projectId}
				const pathMatch = projectUrl.pathname.match(/^\/ex\/jira\/([^/]+)\//)
				if (pathMatch?.[1]) {
					projectResourceId = pathMatch[1]
				}
			} catch {
				// Invalid URL, skip this project
				continue
			}

			if (!projectResourceId) {
				continue
			}

			// Find matching resource by ID
			const matchingResource = accessibleResources.find(
				resource => resource.id === projectResourceId
			)

			if (matchingResource) {
				const group = groups.get(matchingResource.id)
				if (group) {
					group.projects.push(project)
				}
			}
		}

		// Return only groups that have projects
		return Array.from(groups.values()).filter(group => group.projects.length > 0)
	}, [projects, accessibleResources])

	const options = projectGroups.flatMap<ProjectOption>(group =>
		group.projects.map(project => ({
			value: `${group.resource.id}:${project.id}`,
			project,
			resource: group.resource
		}))
	)

	const selectedOptions = options.filter(option => value.includes(option.value))
	const selectedPreview = selectedOptions.slice(0, 2)

	function toggleValue(nextValue: string): void {
		onChange(
			value.includes(nextValue)
				? value.filter(current => current !== nextValue)
				: [...value, nextValue]
		)
	}

	const firstSelected = selectedOptions[0]
	// isEmpty should only be true when:
	// 1. Not loading (isLoading is false)
	// 2. Resources query has completed (resourcesLoaded is true) - this ensures grouping can happen
	// 3. AND projectGroups is empty (no projects after grouping)
	//
	// Important: If resources query hasn't completed, we can't group projects properly,
	// so we shouldn't show "empty" - we should still be showing loading state
	const isEmpty = !isLoading && resourcesLoaded && projectGroups.length === 0
	const isDisabled = isLoading || isEmpty

	let summary = 'Select projects'

	if (isLoading) {
		summary = 'Loading projects...'
	} else if (isEmpty) {
		summary = 'No projects available'
	} else if (selectedOptions.length === 1 && firstSelected) {
		summary = firstSelected.project.name
	} else if (selectedOptions.length > 1) {
		summary = `${selectedOptions.length} projects`
	}

	return (
		<div className='space-y-2'>
			<Label htmlFor='filter-project'>Projects</Label>
			<Popover
				open={open}
				onOpenChange={setOpen}
			>
				<PopoverTrigger asChild>
					<Button
						id='filter-project'
						variant='outline'
						role='combobox'
						aria-expanded={open}
						className='group h-10 w-full justify-between border-border/50 bg-background px-3 text-left shadow-sm transition-all hover:border-border hover:shadow-xs data-[state=open]:border-border data-[state=open]:shadow-xs disabled:opacity-50 disabled:cursor-not-allowed'
						disabled={isDisabled}
					>
						<div className='flex min-w-0 flex-1 items-center gap-2.5'>
							{isLoading ? (
								<>
									<Skeleton className='size-6 rounded-full' />
									<Skeleton className='h-4 flex-1 max-w-[140px]' />
									<Spinner
										className='ml-auto size-4 shrink-0 text-muted-foreground'
										aria-label='Loading projects'
									/>
								</>
							) : isEmpty ? (
								<span className='text-sm text-muted-foreground'>{summary}</span>
							) : selectedOptions.length > 0 ? (
								<>
									<div className='flex -space-x-1.5'>
										{selectedPreview.map(option => (
											<Avatar
												key={option.value}
												className='size-6 border-2 border-background shadow-xs ring-1 ring-border/20'
											>
												{getProjectAvatarUrl(option.project) && (
													<AvatarImage
														src={getProjectAvatarUrl(option.project)}
														alt={option.project.name}
													/>
												)}
												<AvatarFallback className='text-[10px] font-semibold'>
													{getInitialsFromLabel(option.project.key ?? option.project.name)}
												</AvatarFallback>
											</Avatar>
										))}
									</div>
									<span className='truncate text-sm font-medium'>{summary}</span>
									{selectedOptions.length > selectedPreview.length && (
										<Badge
											variant='secondary'
											className='ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium'
										>
											+{selectedOptions.length - selectedPreview.length}
										</Badge>
									)}
								</>
							) : (
								<span className='text-sm text-muted-foreground'>{summary}</span>
							)}
						</div>
						<ChevronDownIcon className='ml-2 size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180' />
					</Button>
				</PopoverTrigger>
				<PopoverContent
					align='start'
					className='w-[440px] p-0'
				>
					<Command className='rounded-lg'>
						<CommandInput
							placeholder='Search projects or resources...'
							className='h-11 border-0'
							disabled={isLoading || isEmpty}
						/>
						<CommandList>
							{isLoading ? null : isEmpty ? (
								<div className='flex flex-col items-center justify-center py-12 px-4 text-center'>
									<div className='mb-3 flex size-12 items-center justify-center rounded-full bg-muted'>
										<LayersIcon
											className='size-6 text-muted-foreground'
											aria-hidden='true'
										/>
									</div>
									<p className='mb-1 text-sm font-medium text-foreground'>No projects available</p>
									<p className='text-xs text-muted-foreground'>
										Projects will appear here once they're loaded
									</p>
								</div>
							) : (
								<>
									<CommandEmpty className='py-8 text-sm text-muted-foreground'>
										No projects found
									</CommandEmpty>
									<ScrollArea className='max-h-[320px]'>
										<div className='p-2'>
											{projectGroups.map((group, groupIndex) => (
												<div
													key={group.resource.id}
													className={cn('rounded-lg', groupIndex > 0 && 'mt-3')}
												>
													<CommandGroup className='p-0'>
														<div className='mb-2 flex items-center gap-2.5 px-2 py-1.5'>
															<Avatar className='size-5 shrink-0 rounded border border-border/40 shadow-xs'>
																{group.resource.avatarUrl && (
																	<AvatarImage
																		src={group.resource.avatarUrl}
																		alt={group.resource.name}
																	/>
																)}
																<AvatarFallback className='bg-primary/10 text-[10px] font-semibold uppercase text-primary'>
																	{getInitialsFromLabel(group.resource.name)}
																</AvatarFallback>
															</Avatar>
															<span className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
																{group.resource.name}
															</span>
															<div className='h-px flex-1 bg-border/50' />
															<Badge
																variant='secondary'
																className='shrink-0 rounded px-1.5 py-0 text-[10px] font-medium'
															>
																{group.projects.length}
															</Badge>
														</div>
														<div className='space-y-0.5'>
															{group.projects.map(project => {
																const optionValue = `${group.resource.id}:${project.id}`
																const checked = value.includes(optionValue)
																const projectAvatarUrl = getProjectAvatarUrl(project)

																return (
																	<CommandItem
																		key={optionValue}
																		value={`${project.name} ${group.resource.name} ${project.key}`}
																		onSelect={() => {
																			toggleValue(optionValue)
																		}}
																		className='group/item relative flex items-center gap-3 rounded-md px-2.5 py-2.5 text-sm outline-hidden transition-colors data-[selected=true]:bg-accent/50 data-[selected=true]:text-accent-foreground hover:bg-accent/30'
																	>
																		<Checkbox
																			checked={checked}
																			className='pointer-events-none shrink-0 data-[state=checked]:bg-blue-300 data-[state=checked]:border-blue-300 data-[state=checked]:text-white'
																		/>
																		<Avatar className='size-8 shrink-0 border border-border/40 shadow-xs ring-1 ring-border/20'>
																			{projectAvatarUrl && (
																				<AvatarImage
																					src={projectAvatarUrl}
																					alt={project.name}
																				/>
																			)}
																			<AvatarFallback className='text-[11px] font-semibold'>
																				{getInitialsFromLabel(project.key ?? project.name)}
																			</AvatarFallback>
																		</Avatar>
																		<div className='flex min-w-0 flex-1 items-center gap-2'>
																			<div className='flex min-w-0 flex-1 flex-col gap-0.5'>
																				<span className='truncate text-sm font-medium leading-tight'>
																					{project.name}
																				</span>
																				<span className='truncate text-xs text-muted-foreground'>
																					{project.projectTypeKey}
																				</span>
																			</div>
																			<Badge
																				variant='outline'
																				className='ml-auto shrink-0 font-mono text-[10px] font-medium'
																			>
																				{project.key}
																			</Badge>
																		</div>
																	</CommandItem>
																)
															})}
														</div>
													</CommandGroup>
												</div>
											))}
										</div>
									</ScrollArea>
								</>
							)}
						</CommandList>

						{!isLoading && !isEmpty && (
							<div
								className={cn(
									'overflow-hidden border-t border-border/50 bg-muted/30 transition-all duration-200',
									selectedOptions.length > 0 ? 'max-h-12 opacity-100' : 'max-h-0 border-0 opacity-0'
								)}
							>
								<div className='flex items-center justify-between px-3 py-2'>
									<span className='text-xs font-medium text-muted-foreground'>
										{selectedOptions.length} {selectedOptions.length === 1 ? 'project' : 'projects'}{' '}
										selected
									</span>
									<Button
										type='button'
										variant='ghost'
										size='sm'
										className='h-7 px-2 text-xs font-medium'
										onClick={() => {
											onChange([])
										}}
									>
										Clear all
									</Button>
								</div>
							</div>
						)}
					</Command>
				</PopoverContent>
			</Popover>
		</div>
	)
}

interface UseResourcesQueryOptions {
	userId?: string
}

function useResourcesQuery(options: UseResourcesQueryOptions) {
	const { userId } = options

	return useQuery({
		queryKey: ['resources', { userId }],
		queryFn: async ({ queryKey, signal }) => {
			const response = await fetch('/api/resources', { signal })

			if (!response.ok) {
				throw new Error(`Failed to fetch resources: ${response.statusText}`)
			}

			const resources = (await response.json()) as AccessibleResource[]
			return resources
		},

		enabled(query) {
			return userId !== undefined
		}
	})
}

interface UseProjectsQueryOptions {
	userId?: string
	accessibleResourceIds?: string[]
	enabled?: boolean
}

function useProjectsQuery(options: UseProjectsQueryOptions) {
	const { userId, accessibleResourceIds, enabled } = options

	return useQuery({
		queryKey: [
			'projects',

			{
				userId: userId,
				accessibleResourceIds: accessibleResourceIds
			}
		],

		async queryFn({ queryKey, signal }) {
			const response = await fetch('/api/projects', { signal })

			if (!response.ok) {
				throw new Error(`Failed to fetch projects: ${response.statusText}`)
			}

			const projects = (await response.json()) as Project[]
			return projects
		},

		enabled
	})
}

interface UseUsersQueryOptions {
	userId?: string
	projectIds?: string[]
	enabled?: boolean
}

function useUsersQuery(options: UseUsersQueryOptions) {
	const { userId, projectIds, enabled } = options

	const query = useInfiniteQuery({
		queryKey: [
			'users',
			{
				userId: userId,
				projectIds: projectIds
			}
		],

		initialPageParam: 1,

		async queryFn({ queryKey, signal, pageParam }) {
			const params = getQueryKeyParams(queryKey)

			const searchParams = new URLSearchParams([
				...(params.projectIds?.map(projectId => ['filter[project]', projectId]) ?? []),
				['page[number]', pageParam.toString(10)],
				['page[size]', '10']
			])

			const response = await fetch(`/api/users?${searchParams}`, { signal })

			if (!response.ok) {
				throw new Error(`Failed to fetch users: ${response.statusText}`)
			}

			const users = (await response.json()) as JiraUser[]
			return users
		},

		getNextPageParam(lastPage, allPages, lastPageParam, allPageParams) {
			if (lastPage.length === 0) {
				return undefined
			}

			return lastPageParam + 1
		},

		getPreviousPageParam(firstPage, allPages, firstPageParam, allPageParams) {
			if (firstPage.length === 0) {
				return undefined
			}

			return firstPageParam - 1
		},

		enabled
	})

	useEffect(() => {
		if (query.hasNextPage && !query.isFetchingNextPage && !query.isError) {
			query.fetchNextPage()
		}
	}, [query.hasNextPage, query.isFetchingNextPage, query.isError, query.fetchNextPage])

	return query
}

interface UseWorklogEntriesQueryOptions {
	userId?: string
	projectIds?: string[]
	userIds?: string[]
	fromDate?: Date
	toDate?: Date
	enabled?: boolean
}

function useWorklogEntriesQuery(options: UseWorklogEntriesQueryOptions) {
	const { userId, projectIds, userIds, fromDate, toDate, enabled } = options

	return useQuery({
		queryKey: [
			'worklog-entries',
			{
				userId: userId,
				projectIds: projectIds,
				userIds: userIds,
				fromDate: fromDate,
				toDate: toDate
			}
		],

		async queryFn({ queryKey, signal }) {
			const params = getQueryKeyParams(queryKey)

			const searchParams = new URLSearchParams([
				...(params.projectIds?.map(projectId => ['filter[project]', projectId]) ?? []),
				...(params.userIds?.map(userId => ['filter[user]', userId]) ?? []),
				...(params.fromDate ? [['filter[from]', params.fromDate.toISOString()]] : []),
				...(params.toDate ? [['filter[to]', params.toDate.toISOString()]] : [])
			])

			const response = await fetch(`/api/worklog/entries?${searchParams}`, { signal })

			if (!response.ok) {
				throw new Error(`Failed to fetch worklog entries: ${response.statusText}`)
			}

			const worklogEntries = (await response.json()) as WorklogEntry[]
			return worklogEntries
		},

		enabled
	})
}

interface UseFullCalendarOptions {
	onSuccess?: () => void
}

function useFullCalendar(options: UseFullCalendarOptions) {
	const { onSuccess } = options

	const [isVisible, setIsVisible] = useState(false)

	const pluginsRef = useRef<PluginDef[]>([])
	const draggableConstructorRef = useRef<typeof Draggable>(null)

	useEffect(() => {
		Promise.all([
			import('@fullcalendar/timegrid')
				.then(module => module.default)
				.then(module => {
					pluginsRef.current.push(module)
				}),

			import('@fullcalendar/interaction')
				.then(module => module.default)
				.then(module => {
					pluginsRef.current.push(module)
				}),

			import('@fullcalendar/interaction')
				.then(module => module.Draggable)
				.then(module => {
					draggableConstructorRef.current = module
				})
		])
			.then(() => {
				setIsVisible(true)
				onSuccess?.()
			})
			.catch(err => {
				// console.error(err)
			})
	}, [onSuccess])

	const value = useMemo(
		() => ({
			plugins: pluginsRef.current,
			Draggable: draggableConstructorRef.current,
			isVisible
		}),
		[isVisible]
	)

	return value
}

export default function IndexPage(): React.ReactNode {
	const layoutLoaderData = useRouteLoaderData<LayoutRoute.ComponentProps['loaderData']>('routes/__')
	const currentUserId = layoutLoaderData?.user.account_id

	// Calendar ref for programmatic navigation
	const calendarRef = useRef<FullCalendarType | null>(null)
	const [calendarTitle, setCalendarTitle] = useState('')

	// Loaded events cache - stores all events fetched from API (persists across date range changes)
	const loadedEventsRef = useRef(new Map<string, CalendarEvent>())

	// Pending changes - user modifications not yet saved to API
	const [pendingChanges, setPendingChanges] = useState(new Map<string, PendingChange>())

	const [issues, setIssues] = useState<Issue[]>([])

	const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
	const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
	const [fromDate, setFromDate] = useState<Date | undefined>(undefined)
	const [toDate, setToDate] = useState<Date | undefined>(undefined)

	const [isFiltersOpen, setIsFiltersOpen] = useState(true)

	const calendar = useFullCalendar({
		onSuccess: () => {
			setIssues(fakeIssues)
		}
	})

	const resourcesQuery = useResourcesQuery({
		userId: currentUserId
	})

	const projectsQuery = useProjectsQuery({
		userId: currentUserId,
		accessibleResourceIds: resourcesQuery.data?.map(resource => resource.id),

		enabled:
			resourcesQuery.isEnabled &&
			resourcesQuery.isSuccess &&
			Array.isArray(resourcesQuery.data) &&
			resourcesQuery.data.length > 0
	})

	const usersQuery = useUsersQuery({
		userId: currentUserId,
		projectIds: selectedProjectIds,
		enabled: projectsQuery.isSuccess && selectedProjectIds.length > 0
	})

	const worklogEntriesQuery = useWorklogEntriesQuery({
		userId: currentUserId,
		projectIds: selectedProjectIds,
		userIds: selectedUserIds,
		fromDate: fromDate,
		toDate: toDate,
		enabled:
			usersQuery.isSuccess &&
			selectedUserIds.length > 0 &&
			fromDate !== undefined &&
			toDate !== undefined
	})

	const queryClient = useQueryClient()

	// Mutation for saving worklog entries
	const saveWorklogsMutation = useMutation({
		mutationFn: async (entries: WorklogSaveEntry[]) => {
			const response = await fetch('/api/worklog/entries', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ entries })
			})

			if (!response.ok) {
				const errorData = (await response.json().catch(() => ({}))) as { error?: string }
				throw new Error(errorData.error ?? `Failed to save worklogs: ${response.statusText}`)
			}

			return response.json() as Promise<SaveWorklogsActionResponse>
		},

		onSuccess: data => {
			// Clear loaded events cache to force fresh data
			loadedEventsRef.current.clear()

			// Invalidate worklog entries query to refetch
			queryClient.invalidateQueries({ queryKey: ['worklog-entries'] })

			if (data.success) {
				setPendingChanges(new Map())

				toast.success('Worklogs saved successfully', {
					description: `${data.successCount} ${data.successCount === 1 ? 'entry' : 'entries'} saved to Jira`
				})
			} else {
				// Partial success: only clear successfully saved entries
				const failedIssues = data.results
					.filter(r => !r.success)
					.map(r => r.input.issueIdOrKey)
					.slice(0, 3)

				setPendingChanges(prev => {
					const next = new Map(prev)
					for (const result of data.results) {
						if (result.success && result.worklog) {
							const matchingEntry = [...next.entries()].find(([, change]) => {
								const issueKey = change.event.extendedProps?.['issueKey']
								return issueKey === result.input.issueIdOrKey
							})
							if (matchingEntry) {
								next.delete(matchingEntry[0])
							}
						}
					}
					return next
				})

				toast.warning('Partial save completed', {
					description: `${data.successCount} saved, ${data.failureCount} failed: ${failedIssues.join(', ')}${data.failureCount > 3 ? '...' : ''}`
				})
			}
		},

		onError: error => {
			toast.error('Failed to save worklogs', {
				description: error instanceof Error ? error.message : 'An unexpected error occurred'
			})
		}
	})

	const users = useMemo(() => usersQuery.data?.pages.flat() ?? [], [usersQuery.data])
	const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data])
	const accessibleResources = useMemo(() => resourcesQuery.data ?? [], [resourcesQuery.data])
	const worklogEntries = useMemo(() => worklogEntriesQuery.data ?? [], [worklogEntriesQuery.data])

	// Create lookup maps for efficient data access
	const usersByAccountId = useMemo(() => {
		const map = new Map<string, JiraUser>()
		for (const user of users) {
			if (user.accountId) {
				map.set(user.accountId, user)
			}
		}
		return map
	}, [users])

	const projectsByKey = useMemo(() => {
		const map = new Map<string, Project>()
		for (const project of projects) {
			if (project.key) {
				map.set(project.key, project)
			}
		}
		return map
	}, [projects])

	// Transform worklog entries to CalendarEvent and cache them
	const transformWorklogToEvent = useCallback(
		(entry: WorklogEntry): CalendarEvent => {
			const projectKey = getProjectKeyFromIssueKey(entry.issueKey)
			const { backgroundColor, borderColor } = getWorklogColors(entry.authorAccountId, projectKey)
			const isEditable = currentUserId !== undefined && entry.authorAccountId === currentUserId
			const startedAt = Date.parse(entry.started)
			const durationSeconds = Math.max(entry.timeSpentSeconds, 0)

			const endAt = Number.isNaN(startedAt)
				? undefined
				: new Date(startedAt + durationSeconds * 1000)

			// Look up author data
			const author = entry.authorAccountId ? usersByAccountId.get(entry.authorAccountId) : undefined

			const authorAvatarUrl =
				author?.avatarUrls?.['48x48'] ??
				author?.avatarUrls?.['32x32'] ??
				author?.avatarUrls?.['24x24'] ??
				undefined

			const authorEmail = author?.emailAddress

			// Look up project data
			const project = projectKey ? projectsByKey.get(projectKey) : undefined
			const projectName = project?.name
			const projectAvatarUrl = project ? getProjectAvatarUrl(project) : undefined

			return {
				id: entry.id,
				title: `${entry.issueKey} ${entry.issueSummary}`,
				start: entry.started,
				end: endAt,
				editable: isEditable,
				startEditable: isEditable,
				durationEditable: isEditable,
				classNames: isEditable ? ['worklog-event'] : ['worklog-event', 'worklog-event--readonly'],

				backgroundColor,
				borderColor,

				extendedProps: {
					worklogEntryId: entry.id,
					issueId: entry.issueId,
					issueKey: entry.issueKey,
					issueSummary: entry.issueSummary,
					authorAccountId: entry.authorAccountId,
					authorDisplayName: entry.authorDisplayName,
					authorEmail,
					authorAvatarUrl,
					projectKey,
					projectName,
					projectAvatarUrl,
					timeSpentSeconds: entry.timeSpentSeconds,
					started: entry.started,
					isModified: false
				}
			}
		},
		[currentUserId, usersByAccountId, projectsByKey]
	)

	// Transform worklog entries to CalendarEvents and cache them
	const loadedEvents = useMemo(() => {
		const eventsMap = new Map<string, CalendarEvent>()

		for (const entry of worklogEntries) {
			// Check if we already have this event cached
			const cached = loadedEventsRef.current.get(entry.id)
			if (cached) {
				eventsMap.set(entry.id, cached)
			} else {
				const event = transformWorklogToEvent(entry)
				loadedEventsRef.current.set(entry.id, event)
				eventsMap.set(entry.id, event)
			}
		}

		return eventsMap
	}, [worklogEntries, transformWorklogToEvent])

	// Merge loaded events with pending changes to create display events
	const displayEvents = useMemo(() => {
		const result: CalendarEvent[] = []

		// Start with all loaded events
		for (const [id, event] of loadedEvents) {
			const pendingChange = pendingChanges.get(id)

			if (pendingChange) {
				// Apply pending change
				if (pendingChange.type === 'delete') {
					// Skip deleted events
					continue
				}
				// For update, use the modified event with isModified flag
				result.push({
					...pendingChange.event,
					extendedProps: {
						...pendingChange.event.extendedProps,
						isModified: true
					}
				})
			} else {
				// No pending change, use original
				result.push(event)
			}
		}

		// Add newly created events (not in loaded cache)
		for (const [id, change] of pendingChanges) {
			if (change.type === 'create') {
				result.push({
					...change.event,
					extendedProps: {
						...change.event.extendedProps,
						isModified: true
					}
				})
			}
		}

		return result
	}, [loadedEvents, pendingChanges])

	// Check if there are any pending changes
	const hasPendingChanges = pendingChanges.size > 0

	// Helper function to add/update a pending change
	const updatePendingChange = useCallback(
		(eventId: string, event: CalendarEvent, type: PendingChangeType) => {
			setPendingChanges(prev => {
				const next = new Map(prev)
				const originalEvent = loadedEventsRef.current.get(eventId)

				next.set(eventId, {
					type: originalEvent ? type : 'create',
					event,
					originalEvent
				})

				return next
			})
		},
		[]
	)

	// Helper function to discard all pending changes
	const discardPendingChanges = useCallback(() => {
		setPendingChanges(new Map())
	}, [])

	// Helper function to discard a single pending change
	const discardPendingChange = useCallback((eventId: string) => {
		setPendingChanges(prev => {
			const next = new Map(prev)
			next.delete(eventId)
			return next
		})
	}, [])

	// Create a map of project key to resource ID for efficient lookup
	const projectKeyToResourceId = useMemo(() => {
		const map = new Map<string, string>()
		for (const projectId of selectedProjectIds) {
			// Format: "resourceId:projectId"
			const [resourceId] = projectId.split(':')
			const project = projects.find(p => projectId === `${resourceId}:${p.id}`)
			if (project && resourceId) {
				map.set(project.key, resourceId)
			}
		}
		return map
	}, [selectedProjectIds, projects])

	// Handler for saving pending changes
	const handleSaveChanges = useCallback(() => {
		if (pendingChanges.size === 0 || saveWorklogsMutation.isPending) {
			return
		}

		const entries: WorklogSaveEntry[] = []

		for (const [eventId, change] of pendingChanges) {
			// Skip delete operations for now (would need a separate endpoint)
			if (change.type === 'delete') {
				continue
			}

			const { event } = change
			const issueKey = event.extendedProps?.['issueKey'] as string | undefined
			const projectKey = issueKey ? getProjectKeyFromIssueKey(issueKey) : undefined
			const resourceId = projectKey ? projectKeyToResourceId.get(projectKey) : undefined

			if (!issueKey || !resourceId) {
				// Can't save without issue key and resource ID
				continue
			}

			const timeSpentSeconds = event.extendedProps?.['timeSpentSeconds'] as number | undefined
			const started = event.extendedProps?.['started'] as string | undefined
			const worklogId = event.extendedProps?.['worklogEntryId'] as string | undefined

			if (timeSpentSeconds === undefined || timeSpentSeconds <= 0 || !started) {
				continue
			}

			// For new events (created via drag), worklogId is a temp nanoid - don't send it
			const isNewEvent = change.type === 'create' || event.extendedProps?.['isNew'] === true

			entries.push({
				worklogId: isNewEvent ? undefined : worklogId,
				issueIdOrKey: issueKey,
				accessibleResourceId: resourceId,
				timeSpentSeconds,
				started
			})
		}

		if (entries.length > 0) {
			saveWorklogsMutation.mutate(entries)
		}
	}, [pendingChanges, saveWorklogsMutation, projectKeyToResourceId])

	// Handler for when an event is dragged to a new time/date
	const handleEventDrop = useCallback(
		(info: EventDropArg) => {
			const { event, oldEvent, revert } = info
			const eventId = event.id

			// Only allow editing own events
			if (event.extendedProps['authorAccountId'] !== currentUserId) {
				revert()
				return
			}

			// Calculate new duration (preserve original duration if end is null)
			const originalDuration =
				oldEvent.end && oldEvent.start
					? oldEvent.end.getTime() - oldEvent.start.getTime()
					: ((event.extendedProps['timeSpentSeconds'] as number) ?? 3600) * 1000

			const newStart = event.start
			const newEnd =
				event.end ?? (newStart ? new Date(newStart.getTime() + originalDuration) : undefined)

			// Get the original or pending event to merge with
			const existingPending = pendingChanges.get(eventId)
			const baseEvent = existingPending?.event ?? loadedEventsRef.current.get(eventId)

			if (!baseEvent || !newStart) {
				revert()
				return
			}

			// Calculate new timeSpentSeconds
			const newTimeSpentSeconds = newEnd
				? Math.round((newEnd.getTime() - newStart.getTime()) / 1000)
				: ((baseEvent.extendedProps?.['timeSpentSeconds'] as number) ?? 3600)

			const updatedEvent: CalendarEvent = {
				...baseEvent,
				start: newStart.toISOString(),
				end: newEnd,
				extendedProps: {
					...baseEvent.extendedProps,
					started: newStart.toISOString(),
					timeSpentSeconds: newTimeSpentSeconds
				}
			}

			updatePendingChange(eventId, updatedEvent, 'update')
		},
		[currentUserId, updatePendingChange, pendingChanges]
	)

	// Handler for when an event is resized
	const handleEventResize = useCallback(
		(info: EventResizeDoneArg) => {
			const { event, oldEvent, revert } = info
			const eventId = event.id

			// Only allow editing own events
			if (event.extendedProps['authorAccountId'] !== currentUserId) {
				revert()
				return
			}

			const newStart = event.start
			const newEnd = event.end

			// Get the original or pending event to merge with
			const existingPending = pendingChanges.get(eventId)
			const baseEvent = existingPending?.event ?? loadedEventsRef.current.get(eventId)

			if (!baseEvent || !newStart || !newEnd) {
				revert()
				return
			}

			// Calculate new timeSpentSeconds
			const newTimeSpentSeconds = Math.round((newEnd.getTime() - newStart.getTime()) / 1000)

			const updatedEvent: CalendarEvent = {
				...baseEvent,
				start: newStart.toISOString(),
				end: newEnd,
				extendedProps: {
					...baseEvent.extendedProps,
					started: newStart.toISOString(),
					timeSpentSeconds: newTimeSpentSeconds
				}
			}

			updatePendingChange(eventId, updatedEvent, 'update')
		},
		[currentUserId, updatePendingChange, pendingChanges]
	)

	// Handler for when an external event is dropped onto the calendar
	const handleEventReceive = useCallback(
		(info: EventReceiveArg) => {
			const { event, revert } = info

			// Generate a temporary ID for new events
			const tempId = nanoid()

			const newStart = event.start
			const newEnd = event.end

			if (!newStart) {
				revert()
				return
			}

			// Default duration: 1 hour if no end time
			const defaultDuration = 3600 * 1000
			const actualEnd = newEnd ?? new Date(newStart.getTime() + defaultDuration)
			const timeSpentSeconds = Math.round((actualEnd.getTime() - newStart.getTime()) / 1000)

			// Extract issue data from the dragged element or event props
			const issueKey = (event.extendedProps['issueKey'] as string | undefined) ?? event.title
			const issueSummary = (event.extendedProps['issueSummary'] as string | undefined) ?? ''
			const issueId = (event.extendedProps['issueId'] as string | undefined) ?? ''
			const projectKey = issueKey ? getProjectKeyFromIssueKey(issueKey) : undefined

			const { backgroundColor, borderColor } = getWorklogColors(currentUserId, projectKey)

			const newEvent: CalendarEvent = {
				id: tempId,
				title: `${issueKey} ${issueSummary}`.trim(),
				start: newStart.toISOString(),
				end: actualEnd,
				editable: true,
				startEditable: true,
				durationEditable: true,
				classNames: ['worklog-event'],
				backgroundColor,
				borderColor,
				extendedProps: {
					worklogEntryId: tempId,
					issueId,
					issueKey,
					issueSummary,
					authorAccountId: currentUserId,
					authorDisplayName: layoutLoaderData?.user.name ?? 'You',
					authorEmail: layoutLoaderData?.user.email,
					authorAvatarUrl: layoutLoaderData?.user.picture,
					projectKey,
					timeSpentSeconds,
					started: newStart.toISOString(),
					isNew: true
				}
			}

			// Remove the FullCalendar-created event (we'll manage it ourselves)
			event.remove()

			updatePendingChange(tempId, newEvent, 'create')
		},
		[currentUserId, updatePendingChange, layoutLoaderData?.user]
	)

	const resourcesLoading = resourcesQuery.isPending || resourcesQuery.isFetching
	const projectsLoading = projectsQuery.isPending || projectsQuery.isFetching

	const usersLoading =
		usersQuery.isEnabled && (usersQuery.isPending || usersQuery.isFetchingNextPage)

	if (!calendar.isVisible) {
		return null
	}

	return (
		<div className='flex flex-col h-full gap-4 p-4'>
			<Collapsible
				open={isFiltersOpen}
				onOpenChange={setIsFiltersOpen}
				className='rounded-xl border bg-linear-to-r from-background via-card to-muted/50 shadow-xs //ring-1 //ring-border/60 backdrop-blur'
			>
				<div className='flex items-center justify-between px-4 py-3'>
					<div className='flex items-center gap-3'>
						<div className='flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary'>
							<SlidersHorizontalIcon className='size-5' />
						</div>
						<div className='space-y-0.5'>
							<p className='text-sm font-semibold leading-none'>Filters</p>
							<p className='text-xs text-muted-foreground'>Shape what shows on the calendar</p>
						</div>
					</div>
					<CollapsibleTrigger asChild>
						<Button
							variant='ghost'
							size='sm'
							className='group gap-1 rounded-full border border-transparent px-3 text-xs hover:border-border'
						>
							{isFiltersOpen ? 'Hide' : 'Show'}
							<ChevronDownIcon
								className={cn(
									'size-4 transition-transform duration-200',
									isFiltersOpen ? 'rotate-180' : ''
								)}
							/>
						</Button>
					</CollapsibleTrigger>
				</div>
				<CollapsibleContent className='border-t px-4 pb-4 pt-3'>
					<div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
						<ProjectsFilter
							projects={projects}
							accessibleResources={accessibleResources}
							isLoading={resourcesLoading || projectsLoading}
							resourcesLoaded={resourcesQuery.isSuccess}
							value={selectedProjectIds}
							onChange={setSelectedProjectIds}
						/>
						<UsersFilter
							users={users}
							isLoading={usersLoading}
							isQueryEnabled={usersQuery.isEnabled}
							value={selectedUserIds}
							onChange={setSelectedUserIds}
						/>
					</div>
				</CollapsibleContent>
			</Collapsible>
			<div className='flex flex-row gap-4 grow'>
				<div className='flex w-80 shrink-0 flex-col gap-3 rounded-lg border bg-muted/30 p-3'>
					<h2 className='text-lg font-semibold text-foreground'>Issues</h2>
					<div className='relative'>
						<SearchIcon className='absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
						<Input
							type='search'
							placeholder='Search issues...'
							className='pl-8'
						/>
					</div>
					<Virtuoso
						data={issues}
						totalCount={issues.length}
						itemContent={(index, issue, context) => {
							invariant(calendar.Draggable, 'Draggable constructor is not defined')

							return (
								<div className='pb-2'>
									<IssueItem
										{...issue}
										isDragged={false}
										components={{
											Draggable: calendar.Draggable
										}}
									/>
								</div>
							)
						}}
					/>
				</div>
				<div className='flex flex-col grow gap-3'>
					{/* Calendar Navigation */}
					<div className='flex h-10 items-center justify-between'>
						<div className='flex items-center gap-1'>
							<Button
								variant='ghost'
								size='icon-sm'
								onClick={() => calendarRef.current?.getApi().prev()}
								className='size-8'
							>
								<ChevronLeftIcon className='size-4' />
							</Button>
							<Button
								variant='ghost'
								size='icon-sm'
								onClick={() => calendarRef.current?.getApi().next()}
								className='size-8'
							>
								<ChevronRightIcon className='size-4' />
							</Button>
							<Button
								variant='ghost'
								size='sm'
								onClick={() => calendarRef.current?.getApi().today()}
								className='ml-1 h-8 text-xs'
							>
								Today
							</Button>
						</div>
						<span className='text-sm font-medium text-foreground'>{calendarTitle}</span>
						<div className='w-32' />
					</div>

					<Suspense fallback={<div>Loading...</div>}>
						<FullCalendar
							ref={calendarRef}
							plugins={calendar.plugins}
							initialView='timeGridWeek'
							headerToolbar={false}
							height='100%'
							dayHeaderFormat={dayHeaderFormat}
							events={displayEvents}
							eventTimeFormat={{
								hour: '2-digit',
								minute: '2-digit',
								hour12: false
							}}
							eventContent={content => <CalendarEventContent {...content} />}
							datesSet={(args: DatesSetArg) => {
								setFromDate(args.view.currentStart)
								setToDate(args.view.currentEnd)
								setCalendarTitle(args.view.title)
							}}
							firstDay={1}
							allDaySlot={false}
							nowIndicator
							editable
							droppable
							// TODO: only enable when "edit" mode is enabled
							// selectable
							// selectMirror
							eventAdd={info => {
								// console.log('Event add', info)
							}}
							eventChange={info => {
								// console.log('Event change', info)
							}}
							eventRemove={info => {
								// console.log('Event remove', info)
							}}
							eventsSet={events => {
								// console.log('Events set', events)
							}}
							eventClick={info => {
								// console.log('Event click', info)
							}}
							eventMouseEnter={info => {
								// console.log('Event mouse enter', info)
							}}
							eventMouseLeave={info => {
								// console.log('Event mouse leave', info)
							}}
							eventDragStart={info => {
								// console.log('Event drag start', info)
							}}
							eventDragStop={info => {
								// console.log('Event drag stop', info)
							}}
							eventDrop={handleEventDrop}
							drop={info => {
								// console.log('Drop', info)
							}}
							eventReceive={handleEventReceive}
							eventLeave={info => {
								// console.log('Event leave', info)
							}}
							eventResizeStart={info => {
								// console.log('Event resize start', info)
							}}
							eventResizeStop={info => {
								// console.log('Event resize stop', info)
							}}
							eventResize={handleEventResize}
						/>
					</Suspense>

					{/* Calendar Toolbar */}
					{hasPendingChanges && (
						<div
							className={cn(
								'flex h-12 items-center justify-between rounded-lg border px-4 transition-all duration-200',
								saveWorklogsMutation.isPending
									? 'border-primary/30 bg-primary/5'
									: 'border-amber-500/30 bg-amber-500/5'
							)}
						>
							<div className='flex items-center gap-3'>
								{saveWorklogsMutation.isPending ? (
									<div className='flex items-center gap-2 text-primary'>
										<Loader2Icon className='size-3.5 animate-spin' />
										<span className='text-sm font-medium'>Saving changes...</span>
									</div>
								) : (
									<div className='flex items-center gap-2 text-amber-600'>
										<PencilIcon className='size-3.5' />
										<span className='text-sm font-medium'>
											{pendingChanges.size} unsaved{' '}
											{pendingChanges.size === 1 ? 'change' : 'changes'}
										</span>
									</div>
								)}
							</div>

							<div className='flex items-center gap-2'>
								<Button
									variant='ghost'
									size='sm'
									onClick={discardPendingChanges}
									disabled={saveWorklogsMutation.isPending}
									className='h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50'
								>
									<XIcon className='size-3.5' />
									Discard
								</Button>
								<Button
									size='sm'
									onClick={handleSaveChanges}
									disabled={saveWorklogsMutation.isPending}
									className='h-8 gap-1.5 text-xs'
								>
									{saveWorklogsMutation.isPending ? (
										<Loader2Icon className='size-3.5 animate-spin' />
									) : (
										<SaveIcon className='size-3.5' />
									)}
									{saveWorklogsMutation.isPending ? 'Saving...' : 'Save'}
								</Button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

interface IssueItemProps extends Issue {
	isDragged: boolean
	components: IssueItemComponents
}

interface IssueItemComponents {
	Draggable: typeof Draggable
}

type BadgeVariant = 'default' | 'secondary' | 'outline'

interface IssueTypeDisplayConfig {
	icon: React.ElementType
	label: string
	className: string
}

interface IssueStatusDisplayConfig {
	icon: React.ElementType
	label: string
	variant: BadgeVariant
}

interface IssuePriorityDisplayConfig {
	icon: React.ElementType
	label: string
	className: string
}

const issueTypeConfig: Record<IssueType, IssueTypeDisplayConfig> = {
	[IssueType.Bug]: { icon: BugIcon, label: 'Bug', className: 'text-red-500' },
	[IssueType.Feature]: { icon: SparklesIcon, label: 'Feature', className: 'text-purple-500' },
	[IssueType.Task]: { icon: CheckCircle2Icon, label: 'Task', className: 'text-blue-500' },
	[IssueType.SubTask]: { icon: LayersIcon, label: 'Subtask', className: 'text-slate-500' },
	[IssueType.Story]: { icon: LightbulbIcon, label: 'Story', className: 'text-amber-500' }
}

const issueStatusConfig: Record<IssueStatus, IssueStatusDisplayConfig> = {
	[IssueStatus.Open]: { icon: CircleIcon, label: 'Open', variant: 'outline' },
	[IssueStatus.Closed]: { icon: CheckCircle2Icon, label: 'Closed', variant: 'secondary' },
	[IssueStatus.InProgress]: { icon: ClockIcon, label: 'In Progress', variant: 'default' },
	[IssueStatus.Done]: { icon: CheckCircle2Icon, label: 'Done', variant: 'secondary' },
	[IssueStatus.Backlog]: { icon: CircleDashedIcon, label: 'Backlog', variant: 'outline' },
	[IssueStatus.Review]: { icon: EyeIcon, label: 'Review', variant: 'default' },
	[IssueStatus.Deployed]: { icon: RocketIcon, label: 'Deployed', variant: 'secondary' }
}

const issuePriorityConfig: Record<IssuePriority, IssuePriorityDisplayConfig> = {
	[IssuePriority.Low]: { icon: SignalLowIcon, label: 'Low', className: 'text-slate-400' },
	[IssuePriority.Medium]: { icon: SignalMediumIcon, label: 'Medium', className: 'text-blue-500' },
	[IssuePriority.High]: { icon: SignalHighIcon, label: 'High', className: 'text-orange-500' },
	[IssuePriority.Critical]: { icon: ZapIcon, label: 'Critical', className: 'text-red-500' }
}

function IssueItem(props: IssueItemProps): React.ReactNode {
	const ref = useRef<HTMLDivElement>(null)
	const Draggable = props.components.Draggable
	const draggableRef = useRef<Draggable>(null)

	useEffect(() => {
		if (!ref.current) {
			return
		}

		const draggable = new Draggable(ref.current, {
			eventData(el) {
				return {
					id: props.id,
					duration: '01:30'
				}
			}
		})

		draggableRef.current = draggable

		return () => {
			draggable.destroy()
		}
	}, [Draggable, props.id])

	const typeConfig = issueTypeConfig[props.type]
	const statusConfig = issueStatusConfig[props.status]
	const priorityConfig = issuePriorityConfig[props.priority]

	const TypeIcon = typeConfig.icon
	const StatusIcon = statusConfig.icon
	const PriorityIcon = priorityConfig.icon

	return (
		<div
			ref={ref}
			className='group cursor-grab rounded-lg border border-border/50 bg-card p-3 shadow-xs select-none //transition-all //hover:border-border //hover:shadow-md active:cursor-grabbing'
		>
			<div className='flex flex-row justify-start items-baseline gap-2 pb-1'>
				{/* Title */}
				<h3 className='text-sm font-medium text-foreground grow line-clamp-1'>{props.name}</h3>

				{/* Header: ID + Type */}
				<div className='flex items-center gap-2 shrink-0'>
					<Badge
						variant='outline'
						className='font-mono text-xs whitespace-nowrap'
					>
						{props.id}
					</Badge>
					<Tooltip>
						<TooltipTrigger asChild>
							<span className={cn('flex items-center gap-1 text-xs', typeConfig.className)}>
								<TypeIcon className='size-3.5' />
								<span className='sr-only'>{typeConfig.label}</span>
							</span>
						</TooltipTrigger>
						<TooltipContent>{typeConfig.label}</TooltipContent>
					</Tooltip>
				</div>
			</div>

			<p className='mb-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground'>
				{props.description || 'No description provided'}
			</p>

			{/* Footer: Status, Priority, Author, Assignees */}
			<div className='flex items-center justify-between gap-2'>
				<div className='flex items-center gap-1.5'>
					{/* Status */}
					<Badge
						variant={statusConfig.variant}
						className='gap-1 text-[10px]'
					>
						<StatusIcon className='size-3' />
						{statusConfig.label}
					</Badge>

					{/* Priority */}
					<Tooltip>
						<TooltipTrigger asChild>
							<span className={cn('flex items-center', priorityConfig.className)}>
								<PriorityIcon className='size-4' />
							</span>
						</TooltipTrigger>
						<TooltipContent>{priorityConfig.label} priority</TooltipContent>
					</Tooltip>
				</div>

				{/* People: Author + Assignees */}
				<div className='flex items-center gap-1'>
					{/* Author */}
					<Tooltip>
						<TooltipTrigger asChild>
							<Avatar className='size-5 ring-2 ring-background'>
								{props.author.avatarUrl && (
									<AvatarImage
										src={props.author.avatarUrl}
										alt={props.author.name}
									/>
								)}
								<AvatarFallback className='text-[8px] font-medium'>
									{props.author.initials}
								</AvatarFallback>
							</Avatar>
						</TooltipTrigger>
						<TooltipContent>
							<div className='text-center'>
								<div className='font-medium'>{props.author.name}</div>
								<div className='text-muted-foreground'>Author</div>
							</div>
						</TooltipContent>
					</Tooltip>

					{/* Assignees */}
					{props.assignees.length > 0 && (
						<div className='flex -space-x-1.5'>
							{props.assignees.slice(0, 3).map(assignee => (
								<Tooltip key={assignee.id}>
									<TooltipTrigger asChild>
										<Avatar className='size-5 ring-2 ring-background'>
											{assignee.avatarUrl && (
												<AvatarImage
													src={assignee.avatarUrl}
													alt={assignee.name}
												/>
											)}
											<AvatarFallback className='text-[8px] font-medium'>
												{assignee.initials}
											</AvatarFallback>
										</Avatar>
									</TooltipTrigger>
									<TooltipContent>
										<div className='text-center'>
											<div className='font-medium'>{assignee.name}</div>
											<div className='text-muted-foreground'>Assignee</div>
										</div>
									</TooltipContent>
								</Tooltip>
							))}
							{props.assignees.length > 3 && (
								<Tooltip>
									<TooltipTrigger asChild>
										<Avatar className='size-5 ring-2 ring-background'>
											<AvatarFallback className='bg-muted text-[8px] font-medium'>
												+{props.assignees.length - 3}
											</AvatarFallback>
										</Avatar>
									</TooltipTrigger>
									<TooltipContent>
										<div className='text-center'>
											{props.assignees.slice(3).map(a => (
												<div key={a.id}>{a.name}</div>
											))}
										</div>
									</TooltipContent>
								</Tooltip>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

interface CalendarEventContentProps extends EventContentArg {}

function CalendarEventContent(props: CalendarEventContentProps): React.ReactNode {
	const { event, timeText } = props

	// Extract data from event extendedProps
	const issueKey = event.extendedProps['issueKey'] as string | undefined
	const issueSummary = event.extendedProps['issueSummary'] as string | undefined
	const authorDisplayName = event.extendedProps['authorDisplayName'] as string | undefined
	const authorAvatarUrl = event.extendedProps['authorAvatarUrl'] as string | undefined
	const projectKey = event.extendedProps['projectKey'] as string | undefined
	const isModified = event.extendedProps['isModified'] === true

	// Fallback parsing from title if extendedProps are missing
	const titleParts = event.title?.split(' ') ?? []
	const parsedIssueKey = issueKey ?? titleParts[0]
	const parsedIssueSummary = issueSummary ?? (titleParts.slice(1).join(' ') || 'Untitled Issue')

	const parsedProjectKey =
		projectKey ?? (parsedIssueKey ? getProjectKeyFromIssueKey(parsedIssueKey) : undefined)

	// Format time - use FullCalendar's timeText or format manually
	const displayTime = (timeText ?? '').replace(' - ', '–')

	// Use props with fallbacks
	const displayAuthor = authorDisplayName ?? 'Unknown Author'
	const displayAuthorAvatarUrl = authorAvatarUrl
	const displayProject = parsedProjectKey ?? 'PROJ'
	const displayIssueKey = parsedIssueKey ?? 'ISSUE-000'
	const displayIssueSummary = parsedIssueSummary

	const issueKeyBadge = (
		<Badge
			variant='outline'
			className={cn(
				'h-4 shrink-0 px-1.5 py-0 text-[10px] font-semibold leading-none shadow-xs backdrop-blur-sm',
				isModified
					? 'border-amber-500/60 bg-amber-500/20 text-amber-600'
					: 'border-border/50 bg-background/60 text-foreground'
			)}
		>
			{displayIssueKey}
		</Badge>
	)

	return (
		<div className='relative flex h-full flex-col gap-1.5 overflow-hidden p-1.5'>
			{/* Time and Issue Key Row */}
			<div className='flex w-full items-baseline justify-between gap-2'>
				{isModified ? (
					<Tooltip>
						<TooltipTrigger asChild>{issueKeyBadge}</TooltipTrigger>
						<TooltipContent side='top'>
							<span className='text-xs'>Unsaved changes</span>
						</TooltipContent>
					</Tooltip>
				) : (
					issueKeyBadge
				)}

				{displayTime ? (
					<Badge
						variant='outline'
						className='h-4 shrink-0 border-border/50 bg-background/60 px-1.5 py-0 text-[10px] font-semibold leading-none text-foreground shadow-xs backdrop-blur-sm'
					>
						{displayTime}
					</Badge>
				) : null}
			</div>

			{/* Issue Summary */}
			<div className='line-clamp-3 min-h-8 text-[11px] font-medium //leading-tight text-foreground'>
				{displayIssueSummary}
			</div>

			{/* Author and Project Row */}
			<div className='mt-auto flex items-center gap-1.5'>
				{displayAuthor ? (
					<div className='flex items-center gap-1 overflow-hidden'>
						<Avatar className='size-5 shrink-0 border border-border/30 shadow-xs'>
							{displayAuthorAvatarUrl ? (
								<AvatarImage
									src={displayAuthorAvatarUrl}
									alt={displayAuthor}
								/>
							) : null}
							<AvatarFallback className='bg-background/60 text-[9px] font-semibold leading-none text-foreground/70'>
								{getInitialsFromLabel(displayAuthor)}
							</AvatarFallback>
						</Avatar>
						<span className='truncate text-[10px] font-medium leading-none text-foreground'>
							{displayAuthor}
						</span>
					</div>
				) : null}
				{displayProject ? (
					<Badge
						variant='outline'
						className='ml-auto h-4 shrink-0 border-border/50 bg-background/60 px-1.5 py-0 text-[10px] font-semibold leading-none text-foreground shadow-xs backdrop-blur-sm'
					>
						{displayProject}
					</Badge>
				) : null}
			</div>
		</div>
	)
}

export function meta(args: Route.MetaArgs): MetaDescriptor[] {
	const title = 'Calendar • Hourly'

	const description =
		'View and manage your worklog entries on an interactive calendar. Filter by projects, drag and drop to edit time entries, and sync changes back to Jira.'

	const keywords =
		'worklog calendar, time tracking calendar, Jira worklog, time entries, calendar view, worklog management, time allocation calendar'

	return [
		{ title },
		{ name: 'description', content: description },
		{ name: 'keywords', content: keywords },

		// Open Graph tags
		{ property: 'og:type', content: 'website' },
		{ property: 'og:title', content: title },
		{ property: 'og:description', content: description },
		// { property: 'og:url', content: `${baseUrl}${pathname}` },

		// Twitter Card tags
		{ name: 'twitter:card', content: 'summary' },
		{ name: 'twitter:title', content: title },
		{ name: 'twitter:description', content: description }
	]
}
