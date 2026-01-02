import type { EventInput, FormatterInput, PluginDef } from '@fullcalendar/core'
import type { Draggable } from '@fullcalendar/interaction'
import type { MetaDescriptor } from 'react-router'
import type { Route as LayoutRoute } from './+types/__.ts'
import type { AccessibleResource, JiraUser, Project } from '~/lib/atlassian/index.ts'
import type { Route } from './+types/__._index.ts'

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { useRouteLoaderData } from 'react-router'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import {
	BugIcon,
	CheckCircle2Icon,
	ChevronDownIcon,
	CircleDashedIcon,
	CircleIcon,
	ClockIcon,
	EyeIcon,
	LayersIcon,
	LightbulbIcon,
	RocketIcon,
	SearchIcon,
	SignalHighIcon,
	SignalLowIcon,
	SignalMediumIcon,
	SlidersHorizontalIcon,
	SparklesIcon,
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
import { cn, invariant } from '~/lib/util/index.ts'
import { getQueryKeyParams } from '~/lib/query/get-query-key-params.ts'

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

const dayHeaderFormat: FormatterInput = {
	month: 'short',
	day: '2-digit',
	weekday: 'short'
}

interface CalendarEvent extends EventInput {}

const fakeEvents: CalendarEvent[] = [
	{
		id: '1',
		title: 'Event 1',
		start: new Date(),
		end: new Date(Date.now() + 1000 * 60 * 60 * 2),
		classNames: ['custom-event', ''],
		backgroundColor: '#ffcc00cc',
		borderColor: '#ffcc00ff'
	}
]

const fakeIssues: Issue[] = [
	{
		id: 'LP-123',
		type: IssueType.Bug,
		status: IssueStatus.Open,
		priority: IssuePriority.Low,
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

	const [events, setEvents] = useState<CalendarEvent[]>([])
	const [issues, setIssues] = useState<Issue[]>([])

	const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
	const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

	const [isFiltersOpen, setIsFiltersOpen] = useState(true)

	const calendar = useFullCalendar({
		onSuccess: () => {
			setEvents(fakeEvents)
			setIssues(fakeIssues)
		}
	})

	const resourcesQuery = useResourcesQuery({
		userId: layoutLoaderData?.user.account_id
	})

	const projectsQuery = useProjectsQuery({
		userId: layoutLoaderData?.user.account_id,
		accessibleResourceIds: resourcesQuery.data?.map(resource => resource.id),

		enabled:
			resourcesQuery.isEnabled &&
			resourcesQuery.isSuccess &&
			Array.isArray(resourcesQuery.data) &&
			resourcesQuery.data.length > 0
	})

	const usersQuery = useUsersQuery({
		userId: layoutLoaderData?.user.account_id,
		projectIds: selectedProjectIds,
		enabled:
			projectsQuery.isSuccess &&
			Array.isArray(projectsQuery.data) &&
			projectsQuery.data.length > 0 &&
			selectedProjectIds.length > 0
	})

	const users = useMemo(() => usersQuery.data?.pages.flat() ?? [], [usersQuery.data])
	const projects = projectsQuery.data ?? []
	const accessibleResources = resourcesQuery.data ?? []

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
				<div className='flex flex-col grow gap-4'>
					<h2 className='text-2xl font-bold'>Calendar</h2>
					<Suspense fallback={<div>Loading...</div>}>
						<FullCalendar
							plugins={calendar.plugins}
							initialView='timeGridWeek'
							height='100%'
							dayHeaderFormat={dayHeaderFormat}
							events={events}
							datesSet={args => {
								// console.log(args)
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
							eventDrop={info => {
								// console.log('Event drop', info)
							}}
							drop={info => {
								// console.log('Drop', info)
							}}
							eventReceive={info => {
								// console.log('Event receive', info)
							}}
							eventLeave={info => {
								// console.log('Event leave', info)
							}}
							eventResizeStart={info => {
								// console.log('Event resize start', info)
							}}
							eventResizeStop={info => {
								// console.log('Event resize stop', info)
							}}
							eventResize={info => {
								// console.log('Event resize', info)
							}}
						/>
					</Suspense>
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
