import type { DateRange } from 'react-day-picker'
import type { NestedFilterOption } from '~/components/filter-multi-select.tsx'
import type { Route } from './+types/__._index.ts'
import type { Event } from 'react-big-calendar'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { luxonLocalizer } from 'react-big-calendar'

import { DateTime } from 'luxon'
import { Virtuoso } from 'react-virtuoso'

import {
	CalendarDays,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Clock,
	Download,
	Filter,
	GitCommit,
	GripVertical,
	Pencil,
	Plus,
	RefreshCw,
	Search,
	Timer,
	Trash2,
	X,
	Zap
} from 'lucide-react'

import { DateRangePicker } from '~/components/date-range-picker.tsx'
import { DraggableSeparator } from '~/components/draggable-separator.tsx'
import { FilterMultiSelect } from '~/components/filter-multi-select.tsx'
import { Button } from '~/components/shadcn/ui/button.tsx'
import { Input } from '~/components/shadcn/ui/input.tsx'
import { Label } from '~/components/shadcn/ui/label.tsx'
import { useHeaderActions } from '~/hooks/use-header-actions.tsx'
import { DragAndDropCalendar } from '~/lib/calendar/drag-and-drop-calendar.client.tsx'

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from '~/components/shadcn/ui/collapsible.tsx'

// Define event interface
interface CalendarEvent extends Event {
	id: number
	title: string
	project: string
	color: string
	isDraggable: boolean
}

// Setup react-big-calendar with Luxon localizer
const localizer = luxonLocalizer(DateTime, { firstDayOfWeek: 1 })

// Calendar formats for 24h time display
const formats = {
	timeGutterFormat: 'HH:mm',
	eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) => {
		return `${DateTime.fromJSDate(start).toFormat('HH:mm')} - ${DateTime.fromJSDate(end).toFormat('HH:mm')}`
	},
	agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) => {
		return `${DateTime.fromJSDate(start).toFormat('HH:mm')} - ${DateTime.fromJSDate(end).toFormat('HH:mm')}`
	}
}

// Helper to create Date objects for calendar events
const createEventDate = (day: number, hour: number, minute = 0): Date => {
	// Using January 2024 as base (0-indexed month)
	return new Date(2024, 0, day, hour, minute)
}

// Mock data with proper Date objects for react-big-calendar
const mockEvents: CalendarEvent[] = [
	{
		id: 1,
		title: 'API Development',
		project: 'PROJ-142',
		start: createEventDate(1, 9, 0),
		end: createEventDate(1, 10, 0),
		color: 'indigo',
		isDraggable: true
	},
	{
		id: 2,
		title: 'UI Design',
		project: 'PROJ-138',
		start: createEventDate(2, 9, 0),
		end: createEventDate(2, 11, 0),
		color: 'slate',
		isDraggable: true
	},
	{
		id: 3,
		title: 'API Development',
		project: 'PROJ-142',
		start: createEventDate(1, 10, 0),
		end: createEventDate(1, 12, 0),
		color: 'indigo',
		isDraggable: true
	},
	{
		id: 4,
		title: 'API Development',
		project: 'PROJ-142',
		start: createEventDate(3, 10, 0),
		end: createEventDate(3, 13, 0),
		color: 'indigo',
		isDraggable: true
	},
	{
		id: 5,
		title: 'Testing',
		project: 'PROJ-156',
		start: createEventDate(4, 10, 0),
		end: createEventDate(4, 11, 30),
		color: 'amber',
		isDraggable: true
	},
	{
		id: 6,
		title: 'Code Review',
		project: 'PROJ-149',
		start: createEventDate(1, 11, 0),
		end: createEventDate(1, 12, 0),
		color: 'emerald',
		isDraggable: true
	},
	{
		id: 7,
		title: 'Code Review',
		project: 'PROJ-149',
		start: createEventDate(2, 11, 0),
		end: createEventDate(2, 12, 30),
		color: 'emerald',
		isDraggable: true
	},
	{
		id: 8,
		title: 'API Development',
		project: 'PROJ-142',
		start: createEventDate(1, 13, 0),
		end: createEventDate(1, 15, 0),
		color: 'indigo',
		isDraggable: true
	},
	{
		id: 9,
		title: 'API Development',
		project: 'PROJ-142',
		start: createEventDate(2, 13, 0),
		end: createEventDate(2, 16, 0),
		color: 'indigo',
		isDraggable: true
	},
	{
		id: 10,
		title: 'UI Design',
		project: 'PROJ-138',
		start: createEventDate(3, 13, 0),
		end: createEventDate(3, 15, 0),
		color: 'slate',
		isDraggable: true
	},
	{
		id: 11,
		title: 'Testing',
		project: 'PROJ-156',
		start: createEventDate(4, 13, 0),
		end: createEventDate(4, 14, 0),
		color: 'amber',
		isDraggable: true
	},
	{
		id: 12,
		title: 'Meetings',
		project: 'PROJ-151',
		start: createEventDate(3, 14, 0),
		end: createEventDate(3, 16, 0),
		color: 'rose',
		isDraggable: true
	},
	{
		id: 13,
		title: 'UI Design',
		project: 'PROJ-138',
		start: createEventDate(1, 15, 0),
		end: createEventDate(1, 17, 0),
		color: 'slate',
		isDraggable: true
	}
]

const mockIssues = [
	{
		id: 'PROJ-142',
		title: 'Implement user authentication',
		assignee: 'John Anderson',
		assigneeAvatar: 'JA',
		status: 'In Progress',
		priority: 'High',
		estimated: '12h',
		logged: '8h',
		updated: '2h ago',
		source: 'calendar' as const,
		labels: ['Backend', 'Security']
	},
	{
		id: 'PROJ-138',
		title: 'Design dashboard mockups',
		assignee: 'Sarah Mitchell',
		assigneeAvatar: 'SM',
		status: 'To Do',
		priority: 'Medium',
		estimated: '6h',
		logged: '0h',
		updated: '1d ago',
		source: 'jira' as const,
		labels: ['Design', 'UI']
	},
	{
		id: 'PROJ-156',
		title: 'Fix mobile responsive issues',
		assignee: 'Michael Chen',
		assigneeAvatar: 'MC',
		status: 'In Review',
		priority: 'High',
		estimated: '4h',
		logged: '5h',
		updated: '30m ago',
		source: 'commit' as const,
		labels: ['Frontend', 'Bug']
	}
]

const mockActivityIssues = [
	{
		id: 'PROJ-149',
		title: 'API rate limiting implementation',
		assignee: 'John Anderson',
		assigneeAvatar: 'JA',
		status: 'In Progress',
		priority: 'Critical',
		estimated: '16h',
		logged: '12h',
		updated: '1h ago',
		source: 'commit' as const,
		labels: ['Backend', 'Performance']
	},
	{
		id: 'PROJ-151',
		title: 'Database query optimization',
		assignee: 'Emma Thompson',
		assigneeAvatar: 'ET',
		status: 'To Do',
		priority: 'Medium',
		estimated: '8h',
		logged: '0h',
		updated: '3h ago',
		source: 'jira' as const,
		labels: ['Backend', 'Database']
	}
]

const mockProjectOptions: NestedFilterOption[] = [
	{
		id: 'portfolio-customer',
		label: 'Customer Platforms',
		description: 'Customer-facing Jira programs grouped by initiative',
		children: [
			{
				id: 'program-experience',
				label: 'Experience',
				description: 'Surface-level improvements that affect the schedule UI',
				children: [
					{
						id: 'project-proj-138',
						label: 'Customer Portal Experience',
						value: 'PROJ-138',
						meta: 'CXP',
						description: 'Dashboard refresh & automation (PROJ-138)',
						avatar: { fallback: 'CP' },
						searchTerms: ['dashboard', 'design', 'customer']
					},
					{
						id: 'project-proj-156',
						label: 'Responsive Shell',
						value: 'PROJ-156',
						meta: 'SHELL',
						description: 'Calendar responsive cleanup for mobile (PROJ-156)',
						avatar: { fallback: 'RS' },
						searchTerms: ['mobile', 'qa', 'shell']
					}
				]
			},
			{
				id: 'program-activation',
				label: 'Activation',
				description: 'Tracking work that aligns Jira issues to GitLab commits',
				children: [
					{
						id: 'project-proj-151',
						label: 'Issue Enrichment Service',
						value: 'PROJ-151',
						meta: 'IES',
						description: 'Surfacing Jira context inside GitLab (PROJ-151)',
						avatar: { fallback: 'IE' },
						searchTerms: ['jira', 'gitlab', 'activation']
					}
				]
			}
		]
	},
	{
		id: 'portfolio-engineering',
		label: 'Engineering Foundations',
		description: 'API stability, reconciliation, and integration projects',
		children: [
			{
				id: 'program-reconcile',
				label: 'Reconciliation',
				description: 'Bridges monthly hours across Jira + GitLab',
				children: [
					{
						id: 'project-proj-142',
						label: 'Identity Sync Service',
						value: 'PROJ-142',
						meta: 'IDS',
						description: 'Auth + session service powering auto-reconcile (PROJ-142)',
						avatar: { fallback: 'IS' },
						searchTerms: ['auth', 'api', 'sync']
					},
					{
						id: 'project-proj-149',
						label: 'Commit Meter',
						value: 'PROJ-149',
						meta: 'METER',
						description: 'Rate limiting & guardrails for GitLab events (PROJ-149)',
						avatar: { fallback: 'CM' },
						searchTerms: ['rate limiting', 'gitlab', 'commits']
					}
				]
			},
			{
				id: 'program-insights',
				label: 'Insights',
				description: 'Internal-only work for finance, time tracking, and reporting',
				children: [
					{
						id: 'project-proj-162',
						label: 'Insights Hub',
						value: 'PROJ-162',
						meta: 'INSIGHT',
						description: 'Worklog intelligence & approvals (PROJ-162)',
						avatar: { fallback: 'IH' },
						searchTerms: ['reports', 'worklog', 'approvals']
					}
				]
			}
		]
	}
]

const mockUserOptions: NestedFilterOption[] = [
	{
		id: 'group-engineering',
		label: 'Engineering',
		description: 'People with GitLab write access',
		children: [
			{
				id: 'team-platform',
				label: 'Platform',
				description: 'Schedule + automation owners',
				children: [
					{
						id: 'user-john-anderson',
						label: 'John Anderson',
						value: 'john-anderson',
						description: 'john.anderson@hourly.dev',
						avatar: { fallback: 'JA' },
						searchTerms: ['platform', 'lead', 'backend']
					},
					{
						id: 'user-michael-chen',
						label: 'Michael Chen',
						value: 'michael-chen',
						description: 'michael.chen@hourly.dev',
						avatar: { fallback: 'MC' },
						searchTerms: ['api', 'planner']
					}
				]
			},
			{
				id: 'team-experience',
				label: 'Experience',
				description: 'UI + workflow design partners',
				children: [
					{
						id: 'user-sarah-mitchell',
						label: 'Sarah Mitchell',
						value: 'sarah-mitchell',
						description: 'sarah.mitchell@hourly.dev',
						avatar: { fallback: 'SM' },
						searchTerms: ['design', 'frontend']
					},
					{
						id: 'user-emma-thompson',
						label: 'Emma Thompson',
						value: 'emma-thompson',
						description: 'emma.thompson@hourly.dev',
						avatar: { fallback: 'ET' },
						searchTerms: ['ux', 'research']
					}
				]
			}
		]
	},
	{
		id: 'group-external',
		label: 'External Collaborators',
		description: 'Vendors with Jira-only access',
		children: [
			{
				id: 'team-qa',
				label: 'QA Vendors',
				description: 'Short term QA contractors',
				children: [
					{
						id: 'user-ajay-patel',
						label: 'Ajay Patel',
						value: 'ajay-patel',
						description: 'ajay.patel@contractor.dev',
						avatar: { fallback: 'AP' },
						searchTerms: ['qa', 'contractor']
					}
				]
			}
		]
	}
]

const defaultProjectSelection = ['PROJ-142', 'PROJ-138']
const defaultUserSelection = ['john-anderson', 'sarah-mitchell']

// Solid color mappings - Pastel palette accents
const eventColorTokens = {
	indigo: 'border-light-sky-blue-500 bg-light-sky-blue-800 text-light-sky-blue-100',
	slate: 'border-thistle-500 bg-thistle-800 text-thistle-100',
	emerald: 'border-uranian-blue-500 bg-uranian-blue-800 text-uranian-blue-100',
	amber: 'border-fairy-tale-500 bg-fairy-tale-800 text-fairy-tale-100',
	rose: 'border-carnation-pink-500 bg-carnation-pink-800 text-carnation-pink-100'
}

type ColorKey = keyof typeof eventColorTokens

// Mock users data
export default function POCRoute({ loaderData }: Route.ComponentProps) {
	const [insightsOpen, setInsightsOpen] = useState(true)
	const [filtersOpen, setFiltersOpen] = useState(true)
	const [unsavedChangesOpen, setUnsavedChangesOpen] = useState(false)
	const [dateRange, setDateRange] = useState<DateRange | undefined>({
		from: new Date(2024, 0, 1),
		to: new Date(2024, 0, 7)
	})
	const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(defaultProjectSelection)
	const [selectedUserIds, setSelectedUserIds] = useState<string[]>(defaultUserSelection)
	const projectFilterSummary =
		selectedProjectIds.length === 0 ? 'All projects' : `${selectedProjectIds.length} selected`
	const userFilterSummary =
		selectedUserIds.length === 0 ? 'All users' : `${selectedUserIds.length} users selected`
	const [rightPanelWidth, setRightPanelWidth] = useState(260)
	const { setActions } = useHeaderActions()

	// Calendar state
	const [events, setEvents] = useState<CalendarEvent[]>(mockEvents)
	const [currentDate, setCurrentDate] = useState(new Date(2024, 0, 1))

	// Drag and drop handlers
	const handleEventDrop = useCallback(
		({ event, start, end }: { event: CalendarEvent; start: string | Date; end: string | Date }) => {
			const startDate = typeof start === 'string' ? new Date(start) : start
			const endDate = typeof end === 'string' ? new Date(end) : end
			setEvents(prev =>
				prev.map(ev => (ev.id === event.id ? { ...ev, start: startDate, end: endDate } : ev))
			)
		},
		[]
	)

	const handleEventResize = useCallback(
		({ event, start, end }: { event: CalendarEvent; start: string | Date; end: string | Date }) => {
			const startDate = typeof start === 'string' ? new Date(start) : start
			const endDate = typeof end === 'string' ? new Date(end) : end
			setEvents(prev =>
				prev.map(ev => (ev.id === event.id ? { ...ev, start: startDate, end: endDate } : ev))
			)
		},
		[]
	)

	// Custom event style getter
	const eventStyleGetter = useCallback((event: CalendarEvent) => {
		const colorClass = eventColorTokens[event.color as ColorKey]
		return {
			className: `worklog-calendar__event ${colorClass}`
		}
	}, [])

	// Custom event component
	const EventComponent = useCallback(({ event }: { event: CalendarEvent }) => {
		return (
			<div className='flex flex-col h-full'>
				<div className='text-xs font-semibold leading-tight truncate'>{event.title}</div>
				<div className='text-xs font-bold leading-tight truncate'>{event.project}</div>
			</div>
		)
	}, [])

	// Navigation handlers
	const handleNavigate = useCallback(
		(action: 'PREV' | 'NEXT' | 'TODAY') => {
			const luxonDate = DateTime.fromJSDate(currentDate)
			let newDate: DateTime

			if (action === 'TODAY') {
				newDate = DateTime.now()
			} else if (action === 'PREV') {
				newDate = luxonDate.minus({ weeks: 1 })
			} else {
				newDate = luxonDate.plus({ weeks: 1 })
			}

			setCurrentDate(newDate.toJSDate())
		},
		[currentDate]
	)

	// Format date range for display
	const dateRangeLabel = useMemo(() => {
		const luxonDate = DateTime.fromJSDate(currentDate)
		const startOfWeek = luxonDate.startOf('week')
		const endOfWeek = luxonDate.endOf('week')
		return `${startOfWeek.toFormat('MMM d')} - ${endOfWeek.toFormat('MMM d, yyyy')}`
	}, [currentDate])

	// Flatten all issues with section headers for virtualized list
	const flattenedIssues = useMemo(() => {
		const result: Array<
			| { type: 'header'; section: string }
			| {
					type: 'issue'
					id: string
					title: string
					assignee: string
					assigneeAvatar: string
					status: string
					priority: string
					estimated: string
					logged: string
					updated: string
					source: 'calendar' | 'commit' | 'jira'
					labels: string[]
			  }
		> = []

		result.push({ type: 'header', section: 'Relevant Issues' })
		result.push(...mockIssues.map(issue => ({ type: 'issue' as const, ...issue })))

		result.push({ type: 'header', section: 'From Activity Data' })
		result.push(...mockActivityIssues.map(issue => ({ type: 'issue' as const, ...issue })))

		return result
	}, [])

	useEffect(() => {
		setActions(
			<>
				<Button
					variant='outline'
					className='h-9 border-border px-4 text-foreground hover:bg-surface-muted'
				>
					<Download className='size-4' />
					Export
				</Button>
				<Button className='h-9 bg-light-sky-blue-500 px-4 text-light-sky-blue-100 shadow-sm hover:bg-light-sky-blue-400'>
					<Zap className='size-4' />
					Auto Reconcile
				</Button>
			</>
		)

		return () => {
			setActions(null)
		}
	}, [setActions])

	const handleRightSeparatorDrag = (deltaX: number) => {
		setRightPanelWidth(prev => Math.max(200, Math.min(500, prev - deltaX)))
	}

	return (
		<div className='flex h-full flex-1 overflow-hidden'>
			{/* Center Calendar Area */}

			<div className='flex flex-1 flex-col overflow-hidden'>
				<div className='flex flex-1 flex-col gap-4 p-4 overflow-hidden'>
					{/* Filters */}
					<Collapsible
						open={filtersOpen}
						onOpenChange={setFiltersOpen}
					>
						<div className='rounded-xl border border-border bg-white/95 p-4 shadow-sm backdrop-blur'>
							<CollapsibleTrigger asChild>
								<Button
									variant='ghost'
									className='w-full items-center justify-between gap-4 p-0 text-left hover:bg-transparent'
								>
									<div className='flex flex-1 flex-wrap items-center gap-4'>
										<div className='flex items-center gap-3'>
											<div className='rounded-full bg-surface-muted p-2'>
												<Filter className='size-4 text-light-sky-blue-400' />
											</div>
											<div>
												<p className='text-sm font-semibold text-foreground'>Schedule Filters</p>
												<p className='text-xs text-muted'>
													Refine events and assignees shown below
												</p>
											</div>
										</div>
										<div className='flex flex-wrap items-center gap-3 text-xs font-medium text-muted'>
											<span>Date range: Jan 1-7</span>
											<span>Project scope: {projectFilterSummary}</span>
											<span>{userFilterSummary}</span>
										</div>
									</div>
									<ChevronDown
										className={`size-4 text-muted transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
									/>
								</Button>
							</CollapsibleTrigger>
							<CollapsibleContent className='mt-4 border-t border-border pt-4'>
								<div className='flex flex-wrap items-start gap-4'>
									<div className='flex min-w-[240px] flex-1 flex-col gap-2'>
										<Label className='text-sm font-medium text-muted'>Date Range</Label>
										<DateRangePicker
											dateRange={dateRange}
											onDateRangeChange={setDateRange}
										/>
									</div>

									<div className='flex min-w-[220px] flex-1 flex-col gap-2'>
										<Label className='text-sm font-medium text-muted'>
											Projects <span className='text-xs text-muted'>(affects Users)</span>
										</Label>
										<FilterMultiSelect
											options={mockProjectOptions}
											selectedValues={selectedProjectIds}
											onChange={setSelectedProjectIds}
											placeholder='Select projects'
											searchPlaceholder='Search projects...'
											emptyLabel='No projects found.'
										/>
									</div>

									<div className='flex min-w-[260px] flex-1 flex-col gap-2'>
										<Label className='text-sm font-medium text-muted'>Users</Label>
										<FilterMultiSelect
											options={mockUserOptions}
											selectedValues={selectedUserIds}
											onChange={setSelectedUserIds}
											placeholder='Select team members'
											searchPlaceholder='Search users...'
											emptyLabel='No users found.'
										/>
									</div>
								</div>
							</CollapsibleContent>
						</div>
					</Collapsible>

					{/* Calendar Stack */}
					<div className='flex flex-1 flex-col gap-4 overflow-hidden'>
						{/* Week Navigation */}
						<div className='flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-white/95 px-4 py-3 shadow-sm backdrop-blur'>
							<div className='flex flex-wrap items-center gap-2'>
								<Button
									variant='outline'
									size='icon'
									className='size-9 border-border hover:bg-surface-muted'
									onClick={() => handleNavigate('PREV')}
								>
									<ChevronLeft className='size-4' />
								</Button>
								<span className='text-sm font-medium text-foreground'>{dateRangeLabel}</span>
								<Button
									variant='outline'
									size='icon'
									className='size-9 border-border hover:bg-surface-muted'
									onClick={() => handleNavigate('NEXT')}
								>
									<ChevronRight className='size-4' />
								</Button>
								<Button
									variant='outline'
									className='ml-2 h-9 border-border px-4 hover:bg-surface-muted'
									onClick={() => handleNavigate('TODAY')}
								>
									Today
								</Button>
							</div>
						</div>

						<div className='flex-1 overflow-hidden'>
							<div className='worklog-calendar h-full'>
								<DragAndDropCalendar
									localizer={localizer}
									events={events}
									startAccessor='start'
									endAccessor='end'
									date={currentDate}
									onNavigate={setCurrentDate}
									view='week'
									views={['week']}
									defaultView='week'
									step={60}
									timeslots={1}
									min={new Date(2024, 0, 1, 9, 0)}
									max={new Date(2024, 0, 1, 18, 0)}
									formats={formats}
									onEventDrop={handleEventDrop}
									onEventResize={handleEventResize}
									draggableAccessor={(event: CalendarEvent) => event.isDraggable}
									resizable
									eventPropGetter={eventStyleGetter}
									components={{
										event: EventComponent
									}}
									toolbar={false}
									style={{ height: '100%' }}
								/>
							</div>
						</div>
					</div>

					{/* Unsaved Changes */}
					<div className='rounded-xl border border-border bg-white/95 p-4 shadow-sm backdrop-blur'>
						<Collapsible
							open={unsavedChangesOpen}
							onOpenChange={setUnsavedChangesOpen}
						>
							<CollapsibleTrigger asChild>
								<Button
									variant='ghost'
									className='w-full items-center justify-between gap-4 p-0 text-left hover:bg-transparent'
								>
									<div className='flex flex-1 flex-wrap items-center gap-4 text-left'>
										<div className='flex items-center gap-3'>
											<div className='flex items-center justify-center rounded-full bg-surface-muted p-2'>
												<Clock className='size-4 text-light-sky-blue-400' />
											</div>
											<div>
												<p className='text-sm font-semibold text-foreground'>Unsaved Changes</p>
												<p className='text-xs text-muted'>Last sync: 5m ago</p>
											</div>
											<div className='rounded-md bg-surface-muted px-2 py-1'>
												<span className='text-xs font-semibold text-foreground'>12</span>
											</div>
										</div>
										<div className='flex flex-wrap items-center gap-4 text-xs font-medium text-muted'>
											<span className='flex items-center gap-1 text-foreground'>
												<Plus className='size-3.5 text-light-sky-blue-400' />3 new
											</span>
											<span className='flex items-center gap-1 text-foreground'>
												<Pencil className='size-3.5 text-fairy-tale-400' />7 modified
											</span>
											<span className='flex items-center gap-1 text-foreground'>
												<Trash2 className='size-3.5 text-carnation-pink-400' />2 removed
											</span>
										</div>
									</div>
									<ChevronDown
										className={`size-4 text-muted transition-transform ${unsavedChangesOpen ? 'rotate-180' : ''}`}
									/>
								</Button>
							</CollapsibleTrigger>
							<CollapsibleContent className='mt-4 border-t border-border pt-4'>
								<div className='grid gap-4 md:grid-cols-[2fr_1fr]'>
									<div className='space-y-3 rounded-lg border border-border bg-white/95 p-4 shadow-sm'>
										<div className='flex items-center justify-between border-b border-border pb-3'>
											<div>
												<h3 className='text-sm font-semibold text-foreground'>Changes Summary</h3>
												<p className='text-xs text-muted'>Review before syncing to Jira</p>
											</div>
											<span className='text-xs font-semibold text-muted'>12 pending</span>
										</div>
										<div className='space-y-2 text-sm'>
											<div className='flex items-center justify-between'>
												<div className='flex items-center gap-2'>
													<Plus className='size-3.5 text-light-sky-blue-400' />
													<span className='text-muted'>New</span>
												</div>
												<span className='font-semibold text-foreground'>3</span>
											</div>
											<div className='flex items-center justify-between'>
												<div className='flex items-center gap-2'>
													<Pencil className='size-3.5 text-fairy-tale-400' />
													<span className='text-muted'>Modified</span>
												</div>
												<span className='font-semibold text-foreground'>7</span>
											</div>
											<div className='flex items-center justify-between'>
												<div className='flex items-center gap-2'>
													<Trash2 className='size-3.5 text-carnation-pink-400' />
													<span className='text-muted'>Deleted</span>
												</div>
												<span className='font-semibold text-foreground'>2</span>
											</div>
										</div>
									</div>
									<div className='flex flex-col gap-2 rounded-lg border border-dashed border-border bg-surface-muted/50 p-4'>
										<Button className='h-10 w-full bg-light-sky-blue-500 text-light-sky-blue-100 shadow-sm hover:bg-light-sky-blue-400'>
											<RefreshCw className='size-4' />
											Sync to Jira
										</Button>
										<Button
											variant='ghost'
											className='h-10 w-full text-muted hover:bg-surface-muted hover:text-foreground'
										>
											<X className='size-4' />
											Discard All
										</Button>
									</div>
								</div>
							</CollapsibleContent>
						</Collapsible>
					</div>
				</div>
			</div>

			{/* Right Separator */}
			<DraggableSeparator onDrag={handleRightSeparatorDrag} />

			{/* Right Issues Sidebar */}
			<div
				className='flex flex-col border-l border-border bg-surface-muted/95 shadow-sm backdrop-blur'
				style={{ width: `${rightPanelWidth}px`, flexShrink: 0 }}
			>
				{/* Search */}
				<div className='shrink-0 border-b border-border p-4'>
					<div className='mb-3 flex items-center justify-between'>
						<h3 className='text-sm font-semibold text-foreground'>Search Issues</h3>
					</div>
					<div className='relative'>
						<Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted' />
						<Input
							className='border-border pl-9 focus-visible:ring-light-sky-blue-400'
							placeholder='Find issues to log time...'
						/>
					</div>
				</div>

				{/* Issues - Virtualized */}
				<div className='flex-1 overflow-hidden'>
					<Virtuoso
						style={{ height: '100%' }}
						data={flattenedIssues}
						itemContent={(index, item) => {
							if (item.type === 'header') {
								return (
									<div className='px-4 pb-3 pt-4'>
										<h4 className='text-xs font-medium uppercase tracking-wide text-muted'>
											{item.section}
										</h4>
									</div>
								)
							}

							return (
								<div className='px-4 pb-3'>
									<IssueCard
										id={item.id}
										title={item.title}
										assignee={item.assignee}
										assigneeAvatar={item.assigneeAvatar}
										status={item.status}
										priority={item.priority}
										estimated={item.estimated}
										logged={item.logged}
										updated={item.updated}
										source={item.source}
										labels={item.labels}
									/>
								</div>
							)
						}}
					/>
				</div>

				{/* Quick Insights */}
				<div className='shrink-0 border-t border-border p-4'>
					<Collapsible
						open={insightsOpen}
						onOpenChange={setInsightsOpen}
					>
						<CollapsibleTrigger asChild>
							<Button
								variant='ghost'
								className='w-full justify-between p-0 hover:bg-transparent'
							>
								<div className='flex items-center gap-2'>
									<svg
										className='size-4 text-light-sky-blue-400'
										fill='currentColor'
										viewBox='0 0 24 24'
										role='img'
										aria-label='User icon'
									>
										<path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z' />
									</svg>
									<span className='text-sm font-semibold text-foreground'>Quick Insights</span>
								</div>
								<ChevronDown
									className={`size-4 text-muted transition-transform ${insightsOpen ? 'rotate-180' : ''}`}
								/>
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className='mt-3'>
							<div className='space-y-2 rounded-lg border border-border bg-white/95 p-3 shadow-sm backdrop-blur'>
								<InsightRow
									label='Total hours (Week)'
									value='38h'
								/>
								<InsightRow
									label='Avg per day'
									value='7.6h'
								/>
								<InsightRow
									label='Unlogged days'
									value='0'
								/>
							</div>
						</CollapsibleContent>
					</Collapsible>
				</div>
			</div>
		</div>
	)
}

// Issue Card Component
function IssueCard({
	id,
	title,
	assignee,
	assigneeAvatar,
	status,
	priority,
	estimated,
	logged,
	updated,
	source,
	labels
}: {
	id: string
	title: string
	assignee: string
	assigneeAvatar: string
	status: string
	priority: string
	estimated: string
	logged: string
	updated: string
	source: 'calendar' | 'commit' | 'jira'
	labels: string[]
}) {
	const sourceIcons = {
		calendar: <CalendarDays className='size-4' />,
		commit: <GitCommit className='size-4' />,
		jira: <RefreshCw className='size-4' />
	}

	const sourceLabels = {
		calendar: 'On calendar',
		commit: 'Referenced in commit',
		jira: 'Recently updated'
	}

	const priorityColors = {
		Critical: 'text-carnation-pink-200 bg-carnation-pink-700 border-carnation-pink-500',
		High: 'text-fairy-tale-200 bg-fairy-tale-700 border-fairy-tale-500',
		Medium: 'text-light-sky-blue-200 bg-light-sky-blue-700 border-light-sky-blue-500',
		Low: 'text-thistle-200 bg-thistle-800 border-thistle-600'
	}

	const statusColors = {
		'To Do': 'text-thistle-200 bg-thistle-800',
		'In Progress': 'text-light-sky-blue-200 bg-light-sky-blue-700',
		'In Review': 'text-fairy-tale-200 bg-fairy-tale-700',
		Done: 'text-uranian-blue-200 bg-uranian-blue-700'
	}

	return (
		<div className='group cursor-grab rounded-lg border border-border bg-white p-3 shadow-sm transition-all hover:border-light-sky-blue-400 hover:shadow-md active:cursor-grabbing'>
			{/* Header Row */}
			<div className='mb-2 flex items-start gap-2'>
				<GripVertical className='mt-0.5 size-4 shrink-0 text-muted transition-opacity group-hover:text-muted' />

				<div className='flex flex-1 items-start justify-between gap-2'>
					<div className='flex items-center gap-2'>
						<span
							className='flex size-6 items-center justify-center rounded bg-thistle-800 text-thistle-200'
							title={sourceLabels[source]}
						>
							{sourceIcons[source]}
						</span>
						<span className='text-xs font-bold text-foreground'>{id}</span>
					</div>

					<span
						className={`rounded border px-1.5 py-0.5 text-xs font-medium ${priorityColors[priority as keyof typeof priorityColors]}`}
					>
						{priority}
					</span>
				</div>
			</div>

			{/* Title */}
			<p className='mb-2 line-clamp-2 text-sm font-medium leading-snug text-foreground'>{title}</p>

			{/* Status & Labels */}
			<div className='mb-2 flex flex-wrap items-center gap-1.5'>
				<span
					className={`rounded-md px-2 py-0.5 text-xs font-medium ${statusColors[status as keyof typeof statusColors]}`}
				>
					{status}
				</span>
				{labels.slice(0, 2).map(label => (
					<span
						key={label}
						className='rounded-md bg-thistle-800 px-2 py-0.5 text-xs text-thistle-200'
					>
						{label}
					</span>
				))}
			</div>

			{/* Assignee & Time */}
			<div className='flex items-center justify-between border-t border-border pt-2'>
				<div className='flex items-center gap-2'>
					<div className='flex size-6 items-center justify-center rounded-full bg-light-sky-blue-500 text-xs font-semibold text-light-sky-blue-100'>
						{assigneeAvatar}
					</div>
					<span className='text-xs text-muted'>{assignee.split(' ')[0]}</span>
				</div>

				<div className='flex items-center gap-3 text-xs text-muted'>
					<div className='flex items-center gap-1'>
						<Timer className='size-4' />
						<span>
							{logged}/{estimated}
						</span>
					</div>
					<div className='flex items-center gap-1'>
						<Clock className='size-4' />
						<span>{updated}</span>
					</div>
				</div>
			</div>
		</div>
	)
}

// Insight Row Component
function InsightRow({ label, value }: { label: string; value: string }) {
	return (
		<div className='flex items-center justify-between py-1'>
			<span className='text-xs text-muted'>{label}</span>
			<span className='text-sm font-semibold text-foreground'>{value}</span>
		</div>
	)
}

export async function loader({ request }: Route.LoaderArgs) {
	return {}
}
