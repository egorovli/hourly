import type { EventInput, FormatterInput, PluginDef } from '@fullcalendar/core'
import type { MetaDescriptor } from 'react-router'
import type { Route } from './+types/__._index.ts'
import type { Draggable } from '@fullcalendar/interaction'

import { Suspense, useEffect, useRef, useState, lazy } from 'react'
import { Virtuoso } from 'react-virtuoso'

import { invariant } from '~/lib/util/index.ts'

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
			<div className='flex flex-col gap-4 border'>
				<h2 className='text-2xl font-bold'>Issues</h2>
				<Virtuoso
					// style={{ height: '100%' }}
					data={issues}
					totalCount={issues.length}
					itemContent={(index, issue, context) => {
						invariant(draggableConstructorRef.current, 'Draggable constructor is not defined')

						return (
							<IssueItem
								{...issue}
								components={{
									Draggable: draggableConstructorRef.current
								}}
							/>
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
	components: IssueItemComponents
}

interface IssueItemComponents {
	Draggable: typeof Draggable
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

	return <div ref={ref}>Item {props.name}</div>
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
