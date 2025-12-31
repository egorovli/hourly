import type { EventInput, FormatterInput, PluginDef } from '@fullcalendar/core'
import type { Draggable } from '@fullcalendar/interaction'
import type { MetaDescriptor } from 'react-router'
import type { Route } from './+types/__._index.ts'

import { Suspense, useEffect, useRef, useState, lazy } from 'react'
import {
	Bug,
	CheckCircle2,
	Circle,
	CircleDashed,
	Clock,
	Eye,
	Layers,
	Lightbulb,
	Rocket,
	SignalHigh,
	SignalLow,
	SignalMedium,
	Sparkles,
	Zap
} from 'lucide-react'
import { Virtuoso } from 'react-virtuoso'

import { Avatar, AvatarFallback, AvatarImage } from '~/components/shadcn/ui/avatar.tsx'
import { Badge } from '~/components/shadcn/ui/badge.tsx'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/shadcn/ui/tooltip.tsx'
import { cn, invariant } from '~/lib/util/index.ts'

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

export default function IndexPage(): React.ReactNode {
	const [displayCalendar, setDisplayCalendar] = useState(false)
	const [events, setEvents] = useState<CalendarEvent[]>([])
	const [issues, setIssues] = useState<Issue[]>([])

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
				setDisplayCalendar(true)
				setEvents(fakeEvents)
				setIssues(fakeIssues)

				setTimeout(() => {
					setEvents(events => [
						...events,
						{
							id: '2',
							title: 'Event 2',
							start: new Date(Date.now() + 1000 * 60 * 60 * 2),
							end: new Date(Date.now() + 1000 * 60 * 60 * 4)
						}
					])
				}, 3000)
				// console.log(pluginsRef.current)
				// console.log(draggableConstructorRef.current)
			})
			.catch(err => {
				console.error(err)
			})
	}, [])

	if (!displayCalendar) {
		return null
	}

	// invariant(draggableConstructorRef.current, 'Draggable constructor not found')

	return (
		<div className='h-full flex flex-row gap-4 p-4'>
			<div className='flex w-80 shrink-0 flex-col gap-3 rounded-lg border bg-muted/30 p-3'>
				<h2 className='text-lg font-semibold text-foreground'>Issues</h2>
				<Virtuoso
					// style={{ height: '100%' }}
					data={issues}
					totalCount={issues.length}
					itemContent={(index, issue, context) => {
						invariant(draggableConstructorRef.current, 'Draggable constructor is not defined')

						return (
							<div className='pb-2'>
								<IssueItem
									{...issue}
									isDragged={false}
									components={{
										Draggable: draggableConstructorRef.current
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
						plugins={pluginsRef.current}
						initialView='timeGridWeek'
						height='100%'
						dayHeaderFormat={dayHeaderFormat}
						events={events}
						datesSet={args => {
							console.log(args)
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
							console.log('Event add', info)
						}}
						eventChange={info => {
							console.log('Event change', info)
						}}
						eventRemove={info => {
							console.log('Event remove', info)
						}}
						eventsSet={events => {
							console.log('Events set', events)
						}}
						eventClick={info => {
							console.log('Event click', info)
						}}
						eventMouseEnter={info => {
							console.log('Event mouse enter', info)
						}}
						eventMouseLeave={info => {
							console.log('Event mouse leave', info)
						}}
						eventDragStart={info => {
							console.log('Event drag start', info)
						}}
						eventDragStop={info => {
							console.log('Event drag stop', info)
						}}
						eventDrop={info => {
							console.log('Event drop', info)
						}}
						drop={info => {
							console.log('Drop', info)
						}}
						eventReceive={info => {
							console.log('Event receive', info)
						}}
						eventLeave={info => {
							console.log('Event leave', info)
						}}
						eventResizeStart={info => {
							console.log('Event resize start', info)
						}}
						eventResizeStop={info => {
							console.log('Event resize stop', info)
						}}
						eventResize={info => {
							console.log('Event resize', info)
						}}
					/>
				</Suspense>
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
	[IssueType.Bug]: { icon: Bug, label: 'Bug', className: 'text-red-500' },
	[IssueType.Feature]: { icon: Sparkles, label: 'Feature', className: 'text-purple-500' },
	[IssueType.Task]: { icon: CheckCircle2, label: 'Task', className: 'text-blue-500' },
	[IssueType.SubTask]: { icon: Layers, label: 'Subtask', className: 'text-slate-500' },
	[IssueType.Story]: { icon: Lightbulb, label: 'Story', className: 'text-amber-500' }
}

const issueStatusConfig: Record<IssueStatus, IssueStatusDisplayConfig> = {
	[IssueStatus.Open]: { icon: Circle, label: 'Open', variant: 'outline' },
	[IssueStatus.Closed]: { icon: CheckCircle2, label: 'Closed', variant: 'secondary' },
	[IssueStatus.InProgress]: { icon: Clock, label: 'In Progress', variant: 'default' },
	[IssueStatus.Done]: { icon: CheckCircle2, label: 'Done', variant: 'secondary' },
	[IssueStatus.Backlog]: { icon: CircleDashed, label: 'Backlog', variant: 'outline' },
	[IssueStatus.Review]: { icon: Eye, label: 'Review', variant: 'default' },
	[IssueStatus.Deployed]: { icon: Rocket, label: 'Deployed', variant: 'secondary' }
}

const issuePriorityConfig: Record<IssuePriority, IssuePriorityDisplayConfig> = {
	[IssuePriority.Low]: { icon: SignalLow, label: 'Low', className: 'text-slate-400' },
	[IssuePriority.Medium]: { icon: SignalMedium, label: 'Medium', className: 'text-blue-500' },
	[IssuePriority.High]: { icon: SignalHigh, label: 'High', className: 'text-orange-500' },
	[IssuePriority.Critical]: { icon: Zap, label: 'Critical', className: 'text-red-500' }
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

export async function loader({ request }: Route.LoaderArgs) {
	return {}
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
