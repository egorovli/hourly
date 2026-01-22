import type {
	DateSelectArg,
	DatesSetArg,
	EventContentArg,
	EventDropArg,
	EventInput,
	FormatterInput,
	PluginDef
} from '@fullcalendar/core'

import type { EventDetails } from '~/components/event-details-sheet.tsx'

import type {
	AccessibleResource,
	JiraIssueSearchResult,
	JiraUser,
	Project,
	WorklogEntry
} from '~/lib/atlassian/index.ts'

import type { Draggable, EventReceiveArg, EventResizeDoneArg } from '@fullcalendar/interaction'
import type FullCalendarType from '@fullcalendar/react'
import type { MetaDescriptor } from 'react-router'
import type { Route } from './+types/__._index.ts'
import type { Route as LayoutRoute } from './+types/__.ts'
import type { SyncWorklogsActionResponse } from './api.worklog.entries.tsx'

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DateTime } from 'luxon'
import { nanoid } from 'nanoid'
import { useRouteLoaderData } from 'react-router'
import { toast } from 'sonner'
import { Virtuoso } from 'react-virtuoso'

import {
	lazy,
	Suspense,
	useCallback,
	useDeferredValue,
	useEffect,
	useMemo,
	useRef,
	useState
} from 'react'

import {
	ChevronDownIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	CircleIcon,
	LayersIcon,
	Loader2Icon,
	MoreVerticalIcon,
	PencilIcon,
	SaveIcon,
	SearchIcon,
	SlidersHorizontalIcon,
	SparklesIcon,
	UsersIcon,
	XIcon
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '~/components/shadcn/ui/dropdown-menu.tsx'

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

import { CalendarEventContextMenu } from '~/components/calendar-event-context-menu.tsx'
import { EventDetailsSheet } from '~/components/event-details-sheet.tsx'
import { SwipeableCalendarWrapper } from '~/components/swipeable-calendar-wrapper.tsx'
import { TimezoneSelector } from '~/components/timezone-selector.tsx'
import { useMobileCalendar } from '~/hooks/use-mobile-calendar.ts'
import { useTimezone } from '~/hooks/use-timezone.ts'

const FullCalendar = lazy(() => import('@fullcalendar/react'))

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

/**
 * Represents a worklog entry to be deleted via the API.
 * Used when submitting delete operations to the server.
 */
interface WorklogDeleteEntry {
	worklogId: string
	issueIdOrKey: string
	accessibleResourceId: string
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
	// timezone?: string
	enabled?: boolean
}

function useWorklogEntriesQuery(options: UseWorklogEntriesQueryOptions) {
	const { userId, projectIds, userIds, fromDate, toDate, enabled } = options

	// console.log('useWorklogEntriesQuery options:', options)
	// console.log('queryKey:', [
	// 	'worklog-entries',
	// 	JSON.stringify({
	// 		userId: userId,
	// 		projectIds: projectIds,
	// 		userIds: userIds,
	// 		fromDate: fromDate,
	// 		toDate: toDate
	// 	})
	// ])

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

interface IssuesSearchResponse {
	issues: JiraIssueSearchResult[]
	total: number
	page: number
	pageSize: number
}

interface UseIssuesQueryOptions {
	userId?: string
	projectIds?: string[]
	userIds?: string[]
	fromDate?: Date
	toDate?: Date
	query?: string
	enabled?: boolean
}

function useIssuesQuery(options: UseIssuesQueryOptions) {
	const { userId, projectIds, userIds, fromDate, toDate, query, enabled } = options

	return useQuery({
		queryKey: [
			'issues',
			{
				userId: userId,
				projectIds: projectIds,
				userIds: userIds,
				fromDate: fromDate,
				toDate: toDate,
				query: query
			}
		],

		async queryFn({ queryKey, signal }) {
			const params = getQueryKeyParams(queryKey)

			const searchParams = new URLSearchParams([
				...(params.projectIds?.map(projectId => ['filter[project]', projectId]) ?? []),
				...(params.userIds?.map(userId => ['filter[user]', userId]) ?? []),
				...(params.fromDate ? [['filter[from]', params.fromDate.toISOString()]] : []),
				...(params.toDate ? [['filter[to]', params.toDate.toISOString()]] : []),
				...(params.query ? [['filter[query]', params.query]] : [])
			])

			const response = await fetch(`/api/issues?${searchParams}`, { signal })

			if (!response.ok) {
				throw new Error(`Failed to fetch issues: ${response.statusText}`)
			}

			const data = (await response.json()) as IssuesSearchResponse
			return data
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

	// Timezone preference from cookie
	const timezone = useTimezone(layoutLoaderData?.preferences?.timezone)

	// Calendar ref for programmatic navigation
	const calendarRef = useRef<FullCalendarType | null>(null)
	const [calendarTitle, setCalendarTitle] = useState('')

	// Loaded events cache - stores all events fetched from API (persists across date range changes)
	const loadedEventsRef = useRef(new Map<string, CalendarEvent>())

	// Pending changes - user modifications not yet saved to API
	const [pendingChanges, setPendingChanges] = useState(new Map<string, PendingChange>())

	// Issue search state
	const [issueSearchQuery, setIssueSearchQuery] = useState('')
	const deferredIssueSearchQuery = useDeferredValue(issueSearchQuery)

	const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
	const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
	const [fromDate, setFromDate] = useState<Date | undefined>(undefined)
	const [toDate, setToDate] = useState<Date | undefined>(undefined)

	const [isFiltersOpen, setIsFiltersOpen] = useState(true)

	// Track when "My Work" preset is being applied (to auto-select current user after users load)
	const [pendingMyWorkPreset, setPendingMyWorkPreset] = useState(false)

	const calendar = useFullCalendar({
		onSuccess: () => {
			// Calendar is ready
		}
	})

	// Mobile calendar state and helpers
	const mobileCalendar = useMobileCalendar({
		calendarApi: calendarRef.current?.getApi(),
		onViewChange: view => {
			// Collapse filters on mobile for more space
			if (view === 'mobile') {
				setIsFiltersOpen(false)
			}
		}
	})

	// Event details sheet state (for creating/editing events with issue linking)
	const [eventSheetOpen, setEventSheetOpen] = useState(false)
	const [editingEvent, setEditingEvent] = useState<EventDetails | undefined>(undefined)
	const [eventSheetSearchQuery, setEventSheetSearchQuery] = useState('')
	const deferredEventSheetSearchQuery = useDeferredValue(eventSheetSearchQuery)

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

	const issuesQuery = useIssuesQuery({
		userId: currentUserId,
		projectIds: selectedProjectIds,
		userIds: selectedUserIds,
		fromDate: fromDate,
		toDate: toDate,
		query: deferredIssueSearchQuery.length > 0 ? deferredIssueSearchQuery : undefined,
		enabled: projectsQuery.isSuccess && selectedProjectIds.length > 0 && selectedUserIds.length > 0
	})

	const worklogEntriesQuery = useWorklogEntriesQuery({
		userId: currentUserId,
		projectIds: selectedProjectIds,
		userIds: selectedUserIds,
		fromDate: fromDate,
		toDate: toDate,
		// timezone: timezone.effectiveTimezone,
		enabled:
			usersQuery.isSuccess &&
			selectedUserIds.length > 0 &&
			fromDate !== undefined &&
			toDate !== undefined
	})

	const queryClient = useQueryClient()

	// Unified mutation for syncing worklog entries (both saves and deletes in one request)
	const syncWorklogsMutation = useMutation({
		mutationFn: async (params: { saves: WorklogSaveEntry[]; deletes: WorklogDeleteEntry[] }) => {
			const response = await fetch('/api/worklog/entries', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(params)
			})

			if (!response.ok && response.status !== 207) {
				const errorData = (await response.json().catch(() => ({}))) as { error?: string }
				throw new Error(errorData.error ?? `Failed to sync worklogs: ${response.statusText}`)
			}

			return response.json() as Promise<SyncWorklogsActionResponse>
		},

		onSuccess: data => {
			// Update loadedEventsRef with response data for successful saves (optimistic update)
			// This avoids relying on immediate refetch which may return stale data due to
			// Atlassian API eventual consistency
			for (const result of data.saves.results) {
				if (result.success && result.worklog) {
					const event = transformWorklogToEvent(result.worklog)
					// Use worklog.id directly since CalendarEvent.id is optional
					loadedEventsRef.current.set(result.worklog.id, event)
				}
			}

			// Remove successfully deleted worklogs from loadedEventsRef
			for (const result of data.deletes.results) {
				if (result.success) {
					// Find and remove the event by worklog ID
					for (const [eventId, event] of loadedEventsRef.current) {
						if (event.extendedProps?.['worklogEntryId'] === result.input.worklogId) {
							loadedEventsRef.current.delete(eventId)
							break
						}
					}
				}
			}

			// Delayed background refetch for eventual consistency
			// The Atlassian API may take several seconds to reflect changes in subsequent reads
			setTimeout(() => {
				queryClient.invalidateQueries({ queryKey: ['worklog-entries'] })
			}, 5000)

			if (data.outcome === 'success' || data.outcome === 'empty') {
				// All operations successful - clear all pending changes
				setPendingChanges(new Map())

				if (data.outcome === 'success') {
					toast.success('Changes saved', {
						description: data.summary.message
					})
				}
			} else if (data.outcome === 'partial') {
				// Partial success: only clear successfully completed entries
				setPendingChanges(prev => {
					const next = new Map(prev)

					// Clear successful saves
					for (const result of data.saves.results) {
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

					// Clear successful deletes
					for (const result of data.deletes.results) {
						if (result.success) {
							const matchingEntry = [...next.entries()].find(([, change]) => {
								if (change.type !== 'delete') {
									return false
								}
								const worklogId = change.event.extendedProps?.['worklogEntryId']
								return worklogId === result.input.worklogId
							})
							if (matchingEntry) {
								next.delete(matchingEntry[0])
							}
						}
					}

					return next
				})

				toast.warning('Partial sync completed', {
					description: data.summary.message
				})
			} else {
				// Complete failure
				toast.error('Sync failed', {
					description: data.summary.message
				})
			}
		},

		onError: error => {
			toast.error('Failed to sync worklogs', {
				description: error instanceof Error ? error.message : 'An unexpected error occurred'
			})
		}
	})

	const users = useMemo(() => usersQuery.data?.pages.flat() ?? [], [usersQuery.data])
	const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data])
	const accessibleResources = useMemo(() => resourcesQuery.data ?? [], [resourcesQuery.data])
	const worklogEntries = useMemo(() => worklogEntriesQuery.data ?? [], [worklogEntriesQuery.data])
	const issues = useMemo(() => issuesQuery.data?.issues ?? [], [issuesQuery.data])

	// Auto-select current user when "My Work" preset is pending and users have loaded
	// We check !usersQuery.isFetching to ensure we're using fresh data after project change
	useEffect(() => {
		const handle = setTimeout(() => {
			if (
				pendingMyWorkPreset &&
				usersQuery.isSuccess &&
				!usersQuery.isFetching &&
				users.length > 0 &&
				currentUserId
			) {
				const currentUserExists = users.some(user => user.accountId === currentUserId)
				if (currentUserExists) {
					setSelectedUserIds([currentUserId])
				}
				setPendingMyWorkPreset(false)
			}
		}, 666)

		return () => {
			clearTimeout(handle)
		}
	}, [pendingMyWorkPreset, usersQuery.isSuccess, usersQuery.isFetching, users, currentUserId])

	// Update calendar timezone when preference changes
	// useEffect(() => {
	// 	calendarRef.current?.getApi()?.setOption('timeZone', timezone.effectiveTimezone)
	// }, [timezone.effectiveTimezone])

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

			// Server returns UTC times, use directly
			const startUtc = entry.started
			const startedAt = Date.parse(startUtc)
			const durationSeconds = Math.max(entry.timeSpentSeconds, 0)

			// Calculate end in UTC format (consistent with start)
			const endUtc = Number.isNaN(startedAt)
				? undefined
				: (DateTime.fromMillis(startedAt + durationSeconds * 1000)
						.toUTC()
						.toISO() ?? undefined)

			const startZoned =
				DateTime.fromISO(startUtc, { zone: 'utc' }).setZone(timezone.effectiveTimezone).toISO() ??
				undefined
			const endZoned = endUtc
				? (DateTime.fromISO(endUtc, { zone: 'utc' }).setZone(timezone.effectiveTimezone).toISO() ??
					undefined)
				: undefined

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
				start: startZoned,
				end: endZoned,
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
		[currentUserId, usersByAccountId, projectsByKey, timezone.effectiveTimezone]
	)

	const adjustEventTimesForTimezone = useCallback(
		(event: CalendarEvent): CalendarEvent => {
			const started = event.extendedProps?.['started']
			const timeSpentSeconds = event.extendedProps?.['timeSpentSeconds']

			if (typeof started === 'string' && typeof timeSpentSeconds === 'number') {
				// Recalculate start and end based on timezone
				const startedZoned =
					DateTime.fromISO(started, { zone: 'utc' }).setZone(timezone.effectiveTimezone).toISO() ??
					undefined

				const endZoned =
					DateTime.fromISO(started, { zone: 'utc' })
						.plus({ seconds: timeSpentSeconds })
						.setZone(timezone.effectiveTimezone)
						.toISO() ?? undefined

				return {
					...event,
					start: startedZoned,
					end: endZoned
				}
			}

			return event
		},
		[timezone.effectiveTimezone]
	)

	// Transform worklog entries to CalendarEvents and cache them
	const loadedEvents = useMemo(() => {
		const eventsMap = new Map<string, CalendarEvent>()

		for (const entry of worklogEntries) {
			// Check if we already have this event cached
			const cached = loadedEventsRef.current.get(entry.id)
			if (cached) {
				const event = adjustEventTimesForTimezone(cached)
				loadedEventsRef.current.set(entry.id, event)
				eventsMap.set(entry.id, event)
			} else {
				const event = transformWorklogToEvent(entry)
				loadedEventsRef.current.set(entry.id, event)
				eventsMap.set(entry.id, event)
			}
		}

		return eventsMap
	}, [worklogEntries, transformWorklogToEvent, adjustEventTimesForTimezone])

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

	// Apply "My Work" preset: select all projects and current user
	const applyMyWorkPreset = useCallback(() => {
		if (projects.length === 0 || accessibleResources.length === 0) {
			return
		}

		// Build project IDs in the format "resourceId:projectId"
		const allProjectIds = projects
			.filter(project => !(project.archived ?? false))
			.flatMap(project => {
				// Extract resource ID from project's self URL
				try {
					const projectUrl = new URL(project.self)
					const pathMatch = projectUrl.pathname.match(/^\/ex\/jira\/([^/]+)\//)
					if (pathMatch?.[1]) {
						return [`${pathMatch[1]}:${project.id}`]
					}
				} catch {
					// Invalid URL, skip
				}
				return []
			})

		setSelectedProjectIds(allProjectIds)
		// Mark that we're waiting for users to load so we can auto-select current user
		setPendingMyWorkPreset(true)
	}, [projects, accessibleResources])

	// Helper function to mark an event as deleted
	const markEventAsDeleted = useCallback((eventId: string) => {
		const originalEvent = loadedEventsRef.current.get(eventId)

		if (!originalEvent) {
			// Event might be a newly created one that hasn't been saved yet
			// In this case, just remove it from pending changes
			setPendingChanges(prev => {
				const next = new Map(prev)
				const existing = next.get(eventId)

				if (existing?.type === 'create') {
					// Remove the unsaved new event entirely
					next.delete(eventId)
				}
				return next
			})
			return
		}

		// For existing events, mark as delete pending change
		setPendingChanges(prev => {
			const next = new Map(prev)
			next.set(eventId, {
				type: 'delete',
				event: originalEvent,
				originalEvent
			})
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

	// Helper function to get Jira base URL for an issue
	const getJiraBaseUrl = useCallback(
		(projectKey: string | undefined): string | undefined => {
			if (!projectKey) {
				return undefined
			}
			const resourceId = projectKeyToResourceId.get(projectKey)
			if (!resourceId) {
				return undefined
			}
			const resource = accessibleResources.find(r => r.id === resourceId)
			return resource?.url
		},
		[projectKeyToResourceId, accessibleResources]
	)

	// Handler for saving pending changes (both saves and deletes in a single request)
	const handleSaveChanges = useCallback(() => {
		if (pendingChanges.size === 0 || syncWorklogsMutation.isPending) {
			return
		}

		const saveEntries: WorklogSaveEntry[] = []
		const deleteEntries: WorklogDeleteEntry[] = []

		for (const [, change] of pendingChanges) {
			const { event } = change
			const issueKey = event.extendedProps?.['issueKey'] as string | undefined
			const projectKey = issueKey ? getProjectKeyFromIssueKey(issueKey) : undefined
			const resourceId = projectKey ? projectKeyToResourceId.get(projectKey) : undefined

			if (!issueKey || !resourceId) {
				// Can't process without issue key and resource ID
				continue
			}

			if (change.type === 'delete') {
				// Handle delete operation
				const worklogId = event.extendedProps?.['worklogEntryId'] as string | undefined

				if (worklogId) {
					deleteEntries.push({
						worklogId,
						issueIdOrKey: issueKey,
						accessibleResourceId: resourceId
					})
				}
				continue
			}

			// Handle create/update operation
			const timeSpentSeconds = event.extendedProps?.['timeSpentSeconds'] as number | undefined
			const started = event.extendedProps?.['started'] as string | undefined
			const worklogId = event.extendedProps?.['worklogEntryId'] as string | undefined

			if (timeSpentSeconds === undefined || timeSpentSeconds <= 0 || !started) {
				continue
			}

			// For new events (created via drag), worklogId is a temp nanoid - don't send it
			const isNewEvent = change.type === 'create' || event.extendedProps?.['isNew'] === true

			saveEntries.push({
				worklogId: isNewEvent ? undefined : worklogId,
				issueIdOrKey: issueKey,
				accessibleResourceId: resourceId,
				timeSpentSeconds,
				started
			})
		}

		// Send a single request with both saves and deletes
		syncWorklogsMutation.mutate({ saves: saveEntries, deletes: deleteEntries })
	}, [pendingChanges, syncWorklogsMutation, projectKeyToResourceId])

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

	// Handler for date selection (tap-and-hold or click-and-drag to create events)
	const handleDateSelect = useCallback((selectInfo: DateSelectArg) => {
		const { start, end } = selectInfo

		// Generate a temporary ID for the new event
		const tempId = nanoid()

		// Calculate duration
		const timeSpentSeconds = Math.round((end.getTime() - start.getTime()) / 1000)

		// Open the event details sheet to let user select an issue
		setEditingEvent({
			id: tempId,
			start,
			end,
			isNew: true
		})
		setEventSheetOpen(true)

		// Clear the calendar selection
		calendarRef.current?.getApi().unselect()
	}, [])

	// Handler when user saves an event with a selected issue from the sheet
	const handleEventSheetSave = useCallback(
		(eventId: string, issue: JiraIssueSearchResult) => {
			if (!editingEvent) {
				return
			}

			const projectKey = getProjectKeyFromIssueKey(issue.key)
			const { backgroundColor, borderColor } = getWorklogColors(currentUserId, projectKey)
			const timeSpentSeconds = Math.round(
				(editingEvent.end.getTime() - editingEvent.start.getTime()) / 1000
			)

			const newEvent: CalendarEvent = {
				id: eventId,
				title: `${issue.key} ${issue.fields.summary}`,
				start: editingEvent.start.toISOString(),
				end: editingEvent.end,
				editable: true,
				startEditable: true,
				durationEditable: true,
				classNames: ['worklog-event'],
				backgroundColor,
				borderColor,
				extendedProps: {
					worklogEntryId: eventId,
					issueId: issue.id,
					issueKey: issue.key,
					issueSummary: issue.fields.summary,
					authorAccountId: currentUserId,
					authorDisplayName: layoutLoaderData?.user.name ?? 'You',
					authorEmail: layoutLoaderData?.user.email,
					authorAvatarUrl: layoutLoaderData?.user.picture,
					projectKey,
					timeSpentSeconds,
					started: editingEvent.start.toISOString(),
					isNew: true
				}
			}

			updatePendingChange(eventId, newEvent, 'create')
			setEditingEvent(undefined)
			setEventSheetSearchQuery('')
		},
		[editingEvent, currentUserId, layoutLoaderData?.user, updatePendingChange]
	)

	// Handler when user cancels event creation from the sheet
	const handleEventSheetCancel = useCallback((eventId: string) => {
		setEditingEvent(undefined)
		setEventSheetSearchQuery('')
	}, [])

	// Handler for tapping on an existing event (to change its linked issue)
	const handleEventClick = useCallback(
		(info: {
			event: {
				id: string
				start: Date | null
				end: Date | null
				extendedProps: Record<string, unknown>
			}
		}) => {
			const { event } = info
			const authorAccountId = event.extendedProps['authorAccountId'] as string | undefined

			// Only allow editing own events
			if (authorAccountId !== currentUserId) {
				return
			}

			const issueKey = event.extendedProps['issueKey'] as string | undefined
			const issueSummary = event.extendedProps['issueSummary'] as string | undefined

			if (!event.start || !event.end) {
				return
			}

			setEditingEvent({
				id: event.id,
				start: event.start,
				end: event.end,
				issueKey,
				issueSummary,
				isNew: false
			})
			setEventSheetOpen(true)
		},
		[currentUserId]
	)

	const resourcesLoading = resourcesQuery.isPending || resourcesQuery.isFetching
	const projectsLoading = projectsQuery.isPending || projectsQuery.isFetching

	const usersLoading =
		usersQuery.isEnabled && (usersQuery.isPending || usersQuery.isFetchingNextPage)

	const entriesLoading = worklogEntriesQuery.isFetching
	const issuesLoading = issuesQuery.isFetching

	if (!calendar.isVisible) {
		return null
	}

	return (
		<div className='flex flex-col h-full gap-4 p-4 pb-safe-or-4'>
			{/* Filters - collapsible, auto-collapsed on mobile */}
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
					<div className='flex items-center gap-2'>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant='ghost'
									size='icon-sm'
									className='size-8'
								>
									<MoreVerticalIcon className='size-4' />
									<span className='sr-only'>Filter options</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align='end'>
								<Tooltip>
									<TooltipTrigger asChild>
										<DropdownMenuItem
											onClick={applyMyWorkPreset}
											disabled={resourcesLoading || projectsLoading || projects.length === 0}
											className='gap-2'
										>
											<SparklesIcon className='size-4' />
											<span>My Work</span>
										</DropdownMenuItem>
									</TooltipTrigger>
									<TooltipContent side='left'>
										<p>Select all projects and show only your worklogs</p>
									</TooltipContent>
								</Tooltip>
							</DropdownMenuContent>
						</DropdownMenu>
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
				</div>
				<CollapsibleContent className='border-t px-4 pb-4 pt-3'>
					<div className='grid gap-3 sm:grid-cols-2'>
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
			<div className='flex flex-row gap-4 grow min-h-0'>
				{/* Issues Sidebar - hidden on mobile */}
				{!mobileCalendar.isMobile && (
					<div className='flex w-80 shrink-0 flex-col gap-3 rounded-lg border bg-muted/30 p-3'>
						{/* Issues Panel Header */}
						<div className='flex items-center justify-between'>
							<h2 className='text-lg font-semibold text-foreground'>Issues</h2>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant='ghost'
										size='icon-sm'
										className='size-7'
									>
										<MoreVerticalIcon className='size-4' />
										<span className='sr-only'>Options</span>
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align='end'>
									<DropdownMenuItem
										disabled
										className='gap-2'
									>
										<UsersIcon className='size-4' />
										<span>Prioritize by user</span>
										<Badge
											variant='secondary'
											className='ml-auto text-[10px]'
										>
											Soon
										</Badge>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>

						{/* Search Input */}
						<div className='relative'>
							<SearchIcon className='absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
							<Input
								type='search'
								placeholder='Search by key or text...'
								className='pl-8 pr-8'
								value={issueSearchQuery}
								onChange={e => setIssueSearchQuery(e.target.value)}
							/>
							{issueSearchQuery.length > 0 && (
								<Button
									type='button'
									variant='ghost'
									size='icon-sm'
									className='absolute right-1 top-1/2 size-6 -translate-y-1/2'
									onClick={() => setIssueSearchQuery('')}
								>
									<XIcon className='size-3.5' />
									<span className='sr-only'>Clear search</span>
								</Button>
							)}
						</div>

						{/* Issues List */}
						{issuesLoading ? (
							<div className='flex flex-col gap-2 py-2'>
								<IssueItemSkeleton />
								<IssueItemSkeleton />
								<IssueItemSkeleton />
								<IssueItemSkeleton />
								<IssueItemSkeleton />
							</div>
						) : issues.length === 0 ? (
							<div className='flex flex-col items-center justify-center py-12 px-4 text-center'>
								<div className='mb-3 flex size-12 items-center justify-center rounded-full bg-muted'>
									<SearchIcon className='size-6 text-muted-foreground' />
								</div>
								<p className='mb-1 text-sm font-medium text-foreground'>
									{issueSearchQuery.length > 0 ? 'No matching issues' : 'No issues found'}
								</p>
								<p className='text-xs text-muted-foreground'>
									{issueSearchQuery.length > 0
										? 'Try adjusting your search query'
										: selectedProjectIds.length === 0
											? 'Select projects to see issues'
											: selectedUserIds.length === 0
												? 'Select users to see their issues'
												: 'No issues match the current filters'}
								</p>
							</div>
						) : (
							<Virtuoso
								data={issues}
								totalCount={issues.length}
								itemContent={(index, issue) => {
									invariant(calendar.Draggable, 'Draggable constructor is not defined')

									return (
										<div className='pb-2'>
											<IssueItem
												issue={issue}
												isDragged={false}
												components={{
													Draggable: calendar.Draggable
												}}
											/>
										</div>
									)
								}}
							/>
						)}
					</div>
				)}
				<div className='flex flex-col grow gap-3 min-h-0'>
					{/* Calendar Navigation - responsive */}
					<div className='flex h-12 md:h-10 items-center justify-between'>
						<div className='flex items-center gap-1'>
							<Button
								variant='ghost'
								size='icon-sm'
								onClick={mobileCalendar.navigatePrev}
								className='size-10 md:size-8'
							>
								<ChevronLeftIcon className='size-5 md:size-4' />
							</Button>
							<Button
								variant='ghost'
								size='icon-sm'
								onClick={mobileCalendar.navigateNext}
								className='size-10 md:size-8'
							>
								<ChevronRightIcon className='size-5 md:size-4' />
							</Button>
							<Button
								variant='ghost'
								size='sm'
								onClick={mobileCalendar.navigateToday}
								className='ml-1 h-10 md:h-8 text-sm md:text-xs px-4 md:px-3'
							>
								Today
							</Button>
						</div>
						<span className='text-base md:text-sm font-medium text-foreground'>
							{mobileCalendar.isMobile ? mobileCalendar.formattedDate : calendarTitle}
						</span>
						<div className='flex items-center justify-end gap-2'>
							<Loader2Icon
								className={cn(
									'size-4 animate-spin text-muted-foreground',
									!entriesLoading && 'invisible'
								)}
							/>
							<TimezoneSelector
								value={timezone.preference}
								onChange={timezone.setTimezone}
								systemTimezone={timezone.detectedSystemTz}
								size='sm'
								disabled={timezone.isPending}
							/>
						</div>
					</div>

					{/* Calendar wrapper with proper touch handling */}
					<SwipeableCalendarWrapper
						enabled={mobileCalendar.isMobile}
						className='flex-1 min-h-0'
					>
						<Suspense fallback={<div>Loading...</div>}>
							<FullCalendar
								ref={calendarRef}
								plugins={calendar.plugins}
								initialView={mobileCalendar.calendarOptions.initialView}
								headerToolbar={false}
								height='100%'
								timeZone={timezone.effectiveTimezone}
								dayHeaderFormat={dayHeaderFormat}
								events={displayEvents}
								eventTimeFormat={{
									hour: '2-digit',
									minute: '2-digit',
									hour12: false
								}}
								eventContent={content => (
									<CalendarEventContent
										{...content}
										currentUserId={currentUserId}
										onDelete={markEventAsDeleted}
										getJiraBaseUrl={getJiraBaseUrl}
									/>
								)}
								datesSet={(args: DatesSetArg) => {
									// args.view.currentStart and args.view.currentEnd are 00:00:00 times of the respective days in UTC
									// e.g. if user is in Warsaw (UTC+1), it will be 01:00:00 GMT+0100 (Central European Standard Time)
									// but we have a timezone control, so we need to treat them as 00:00:00 in the selected timezone

									const zonedStart = DateTime.fromJSDate(args.view.currentStart, {
										// zone: 'UTC'
									})
										.setZone(timezone.effectiveTimezone, { keepLocalTime: true })
										.toJSDate()

									const zonedEnd = DateTime.fromJSDate(args.view.currentEnd, {
										// zone: 'utc'
									})
										.setZone(timezone.effectiveTimezone, { keepLocalTime: true })
										.toJSDate()

									// console.log('Start:', args.view.currentStart)
									// console.log('Zoned Start:', zonedStart)

									// console.log('End:', args.view.currentEnd)
									// console.log('Zoned End:', zonedEnd)

									// console.log('---')

									// setFromDate(args.view.currentStart)
									// console.log(args.view.currentStart)
									setFromDate(zonedStart)

									// setToDate(args.view.currentEnd)
									// console.log(args.view.currentEnd)
									setToDate(zonedEnd)

									setCalendarTitle(args.view.title)
									// console.log(args)
								}}
								firstDay={1}
								allDaySlot={false}
								nowIndicator
								editable
								droppable
								dragScroll={false}
								selectable={mobileCalendar.calendarOptions.selectable}
								selectMirror={mobileCalendar.calendarOptions.selectMirror}
								selectLongPressDelay={mobileCalendar.calendarOptions.selectLongPressDelay}
								eventLongPressDelay={mobileCalendar.calendarOptions.eventLongPressDelay}
								longPressDelay={mobileCalendar.calendarOptions.longPressDelay}
								select={handleDateSelect}
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
								eventClick={handleEventClick}
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
					</SwipeableCalendarWrapper>

					{/* Calendar Toolbar */}
					{hasPendingChanges && (
						<div
							className={cn(
								'flex h-12 items-center justify-between rounded-lg border px-4 transition-all duration-200',
								syncWorklogsMutation.isPending
									? 'border-primary/30 bg-primary/5'
									: 'border-amber-500/30 bg-amber-500/5'
							)}
						>
							<div className='flex items-center gap-3'>
								{syncWorklogsMutation.isPending ? (
									<div className='flex items-center gap-2 text-primary'>
										<Loader2Icon className='size-3.5 animate-spin' />
										<span className='text-sm font-medium'>Syncing...</span>
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
									disabled={syncWorklogsMutation.isPending}
									className='h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50'
								>
									<XIcon className='size-3.5' />
									Discard
								</Button>
								<Button
									size='sm'
									onClick={handleSaveChanges}
									disabled={syncWorklogsMutation.isPending || entriesLoading}
									className='h-8 gap-1.5 text-xs'
								>
									{syncWorklogsMutation.isPending ? (
										<Loader2Icon className='size-3.5 animate-spin' />
									) : (
										<SaveIcon className='size-3.5' />
									)}
									{syncWorklogsMutation.isPending ? 'Saving...' : 'Save'}
								</Button>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Event Details Sheet for creating/editing events */}
			<EventDetailsSheet
				open={eventSheetOpen}
				onOpenChange={setEventSheetOpen}
				event={editingEvent}
				issues={issues}
				isLoadingIssues={issuesLoading}
				searchQuery={eventSheetSearchQuery}
				onSearchQueryChange={setEventSheetSearchQuery}
				onSave={handleEventSheetSave}
				onCancel={handleEventSheetCancel}
				isMobile={mobileCalendar.isMobile}
			/>
		</div>
	)
}

interface IssueItemProps {
	issue: JiraIssueSearchResult
	isDragged: boolean
	components: IssueItemComponents
}

interface IssueItemComponents {
	Draggable: typeof Draggable
}

type BadgeVariant = 'default' | 'secondary' | 'outline'

/**
 * Maps Jira status category keys to badge variants
 */
function getStatusBadgeVariant(categoryKey?: string): BadgeVariant {
	switch (categoryKey) {
		case 'done':
			return 'secondary'
		case 'indeterminate':
			return 'default'
		default:
			return 'outline'
	}
}

/**
 * Formats seconds to a human-readable hours string (e.g., "2.5h")
 */
function formatSecondsToHours(seconds: number): string {
	const hours = seconds / 3600
	if (hours < 0.1) {
		return '<0.1h'
	}
	return `${hours.toFixed(1).replace(/\.0$/, '')}h`
}

function IssueItem(props: IssueItemProps): React.ReactNode {
	const { issue, components } = props
	const ref = useRef<HTMLDivElement>(null)
	const Draggable = components.Draggable

	const { fields } = issue
	const assigneeAvatarUrl =
		fields.assignee?.avatarUrls?.['48x48'] ?? fields.assignee?.avatarUrls?.['32x32']

	useEffect(() => {
		if (!ref.current) {
			return
		}

		const draggable = new Draggable(ref.current, {
			eventData: () => ({
				title: `${issue.key} ${fields.summary}`,
				duration: '01:00',
				extendedProps: {
					issueKey: issue.key,
					issueSummary: fields.summary,
					issueId: issue.id
				}
			})
		})

		return () => draggable.destroy()
	}, [Draggable, issue.id, issue.key, fields.summary])

	const statusVariant = getStatusBadgeVariant(fields.status?.statusCategory?.key)

	return (
		<div
			ref={ref}
			className='group cursor-grab rounded-lg border border-border/50 bg-card p-3 shadow-xs select-none active:cursor-grabbing'
		>
			{/* Header: Summary + Key */}
			<div className='flex items-baseline gap-2 pb-1'>
				<h3 className='grow truncate text-sm font-medium'>{fields.summary}</h3>
				<Badge
					variant='outline'
					className='shrink-0 font-mono text-xs'
				>
					{issue.key}
				</Badge>
			</div>

			{/* Footer: Type, Status, Priority, Time, Assignee */}
			<div className='flex items-center justify-between gap-2 pt-1'>
				<div className='flex items-center gap-1.5'>
					{/* Type Icon */}
					{fields.issuetype?.iconUrl && (
						<Tooltip>
							<TooltipTrigger asChild>
								<img
									src={fields.issuetype.iconUrl}
									alt={fields.issuetype.name}
									className='size-4'
								/>
							</TooltipTrigger>
							<TooltipContent>{fields.issuetype.name}</TooltipContent>
						</Tooltip>
					)}

					{/* Status */}
					<Badge
						variant={statusVariant}
						className='text-[10px]'
					>
						{fields.status?.name ?? 'Unknown'}
					</Badge>

					{/* Priority Icon */}
					{fields.priority?.iconUrl && (
						<Tooltip>
							<TooltipTrigger asChild>
								<img
									src={fields.priority.iconUrl}
									alt={fields.priority.name}
									className='size-4'
								/>
							</TooltipTrigger>
							<TooltipContent>{fields.priority.name}</TooltipContent>
						</Tooltip>
					)}

					{/* Time Spent */}
					{fields.timespent !== undefined && fields.timespent > 0 && (
						<span className='text-[10px] text-muted-foreground'>
							{formatSecondsToHours(fields.timespent)}
						</span>
					)}
				</div>

				{/* Assignee */}
				{fields.assignee && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Avatar className='size-5'>
								{assigneeAvatarUrl && (
									<AvatarImage
										src={assigneeAvatarUrl}
										alt={fields.assignee.displayName}
									/>
								)}
								<AvatarFallback className='text-[8px]'>
									{getInitialsFromLabel(fields.assignee.displayName)}
								</AvatarFallback>
							</Avatar>
						</TooltipTrigger>
						<TooltipContent>{fields.assignee.displayName}</TooltipContent>
					</Tooltip>
				)}
			</div>
		</div>
	)
}

function IssueItemSkeleton(): React.ReactNode {
	return (
		<div className='rounded-lg border border-border/50 bg-card p-3'>
			<div className='flex items-center justify-between pb-2'>
				<Skeleton className='h-4 w-32' />
				<Skeleton className='h-5 w-16' />
			</div>
			<div className='flex items-center justify-between pt-1'>
				<Skeleton className='h-5 w-20' />
				<Skeleton className='size-5 rounded-full' />
			</div>
		</div>
	)
}

interface CalendarEventContentProps extends EventContentArg {
	currentUserId?: string
	onDelete: (eventId: string) => void
	getJiraBaseUrl: (projectKey: string | undefined) => string | undefined
}

function CalendarEventContent(props: CalendarEventContentProps): React.ReactNode {
	const { event, timeText, currentUserId, onDelete, getJiraBaseUrl } = props

	// Extract data from event extendedProps
	const issueKey = event.extendedProps['issueKey'] as string | undefined
	const issueSummary = event.extendedProps['issueSummary'] as string | undefined
	const authorAccountId = event.extendedProps['authorAccountId'] as string | undefined
	const authorDisplayName = event.extendedProps['authorDisplayName'] as string | undefined
	const authorAvatarUrl = event.extendedProps['authorAvatarUrl'] as string | undefined
	const projectKey = event.extendedProps['projectKey'] as string | undefined
	const isModified = event.extendedProps['isModified'] === true

	// Determine if the current user can edit this event
	const isEditable = authorAccountId === currentUserId

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

	// Get Jira base URL for this event's project
	const jiraBaseUrl = getJiraBaseUrl(parsedProjectKey)

	return (
		<CalendarEventContextMenu
			event={event}
			isEditable={isEditable}
			onDelete={onDelete}
			jiraBaseUrl={jiraBaseUrl}
		>
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
		</CalendarEventContextMenu>
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
