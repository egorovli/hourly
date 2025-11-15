import type { Route } from './+types/__._index.ts'
import type { DateRange } from 'react-day-picker'

import { useEffect, useMemo, useState } from 'react'
import { Virtuoso } from 'react-virtuoso'

import {
	CalendarDays,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Clock,
	Download,
	GitCommit,
	GripVertical,
	MoreVertical,
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
import { ProjectsCommand } from '~/components/projects-command.tsx'
import { Button } from '~/components/shadcn/ui/button.tsx'
import { Checkbox } from '~/components/shadcn/ui/checkbox.tsx'
import { Input } from '~/components/shadcn/ui/input.tsx'
import { Label } from '~/components/shadcn/ui/label.tsx'
import { ScrollArea } from '~/components/shadcn/ui/scroll-area.tsx'
import { useHeaderActions } from '~/hooks/use-header-actions.tsx'

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from '~/components/shadcn/ui/collapsible.tsx'

// Mock data
const mockEvents = [
	{
		id: 1,
		title: 'API Development',
		project: 'PROJ-142',
		startTime: '9:00',
		endTime: '10:00',
		day: 1,
		color: 'indigo'
	},
	{
		id: 2,
		title: 'UI Design',
		project: 'PROJ-138',
		startTime: '9:00',
		endTime: '11:00',
		day: 2,
		color: 'slate'
	},
	{
		id: 3,
		title: 'API Development',
		project: 'PROJ-142',
		startTime: '10:00',
		endTime: '12:00',
		day: 1,
		color: 'indigo'
	},
	{
		id: 4,
		title: 'API Development',
		project: 'PROJ-142',
		startTime: '10:00',
		endTime: '13:00',
		day: 3,
		color: 'indigo'
	},
	{
		id: 5,
		title: 'Testing',
		project: 'PROJ-156',
		startTime: '10:00',
		endTime: '11:30',
		day: 4,
		color: 'amber'
	},
	{
		id: 6,
		title: 'Code Review',
		project: 'PROJ-149',
		startTime: '11:00',
		endTime: '12:00',
		day: 1,
		color: 'emerald'
	},
	{
		id: 7,
		title: 'Code Review',
		project: 'PROJ-149',
		startTime: '11:00',
		endTime: '12:30',
		day: 2,
		color: 'emerald'
	},
	{
		id: 8,
		title: 'API Development',
		project: 'PROJ-142',
		startTime: '13:00',
		endTime: '15:00',
		day: 1,
		color: 'indigo'
	},
	{
		id: 9,
		title: 'API Development',
		project: 'PROJ-142',
		startTime: '13:00',
		endTime: '16:00',
		day: 2,
		color: 'indigo'
	},
	{
		id: 10,
		title: 'UI Design',
		project: 'PROJ-138',
		startTime: '13:00',
		endTime: '15:00',
		day: 3,
		color: 'slate'
	},
	{
		id: 11,
		title: 'Testing',
		project: 'PROJ-156',
		startTime: '13:00',
		endTime: '14:00',
		day: 4,
		color: 'amber'
	},
	{
		id: 12,
		title: 'Meetings',
		project: 'PROJ-151',
		startTime: '14:00',
		endTime: '16:00',
		day: 3,
		color: 'rose'
	},
	{
		id: 13,
		title: 'UI Design',
		project: 'PROJ-138',
		startTime: '15:00',
		endTime: '17:00',
		day: 1,
		color: 'slate'
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

// Helper to convert time to hour offset
function timeToHourOffset(time: string): number {
	const parts = time.split(':').map(Number)
	const hours = parts[0] ?? 0
	const minutes = parts[1] ?? 0
	return hours - 9 + minutes / 60
}

// Helper to calculate duration in hours
function getDuration(start: string, end: string): number {
	const startParts = start.split(':').map(Number)
	const endParts = end.split(':').map(Number)
	const startHours = startParts[0] ?? 0
	const startMinutes = startParts[1] ?? 0
	const endHours = endParts[0] ?? 0
	const endMinutes = endParts[1] ?? 0
	return endHours - startHours + (endMinutes - startMinutes) / 60
}

// Color gradient mappings - Professional muted palette
const colorGradients = {
	indigo: 'from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-900',
	slate: 'from-slate-50 to-slate-100 border-slate-200 text-slate-900',
	emerald: 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-900',
	amber: 'from-amber-50 to-amber-100 border-amber-200 text-amber-900',
	rose: 'from-rose-50 to-rose-100 border-rose-200 text-rose-900'
}

type ColorKey = keyof typeof colorGradients

// Mock users data
const mockUsers = [
	{ id: '1', name: 'John Anderson', avatar: 'JA', checked: true },
	{ id: '2', name: 'Sarah Mitchell', avatar: 'SM', checked: false },
	{ id: '3', name: 'Michael Chen', avatar: 'MC', checked: false }
]

export default function POCRoute({ loaderData }: Route.ComponentProps) {
	const [insightsOpen, setInsightsOpen] = useState(true)
	const [unsavedChangesOpen, setUnsavedChangesOpen] = useState(true)
	const [dateRange, setDateRange] = useState<DateRange | undefined>({
		from: new Date(2024, 0, 1),
		to: new Date(2024, 0, 7)
	})
	const [selectedProject, setSelectedProject] = useState('all')
	const [leftPanelWidth, setLeftPanelWidth] = useState(240)
	const [rightPanelWidth, setRightPanelWidth] = useState(260)
	const { setActions } = useHeaderActions()

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
					className='h-9 border-slate-300 px-4 hover:bg-slate-50'
				>
					<Download className='mr-2 size-4' />
					Export
				</Button>
				<Button className='h-9 bg-indigo-600 px-4 text-white shadow-sm hover:bg-indigo-500'>
					<Zap className='mr-2 size-4' />
					Auto Reconcile
				</Button>
			</>
		)

		return () => {
			setActions(null)
		}
	}, [setActions])

	const handleLeftSeparatorDrag = (deltaX: number) => {
		setLeftPanelWidth(prev => Math.max(180, Math.min(400, prev + deltaX)))
	}

	const handleRightSeparatorDrag = (deltaX: number) => {
		setRightPanelWidth(prev => Math.max(200, Math.min(500, prev - deltaX)))
	}

	return (
		<div className='flex h-full flex-1 overflow-hidden'>
			{/* Left Filters Panel */}
			<div
				className='flex flex-col border-r border-slate-200 bg-white/95 shadow-sm backdrop-blur'
				style={{ width: `${leftPanelWidth}px`, flexShrink: 0 }}
			>
				{/* Scrollable Filters */}
				<ScrollArea className='flex-1'>
					<div className='space-y-6 p-4'>
						{/* Date Range */}
						<div className='space-y-2'>
							<Label className='text-sm font-medium text-slate-700'>Date Range</Label>
							<DateRangePicker
								dateRange={dateRange}
								onDateRangeChange={setDateRange}
							/>
						</div>

						{/* Projects */}
						<div className='space-y-2'>
							<Label className='text-sm font-medium text-slate-700'>
								Projects <span className='text-xs text-slate-500'>(affects Users)</span>
							</Label>
							<ProjectsCommand
								value={selectedProject}
								onValueChange={setSelectedProject}
							/>
						</div>

						{/* Users */}
						<div className='space-y-3'>
							<Label className='text-sm font-medium text-slate-700'>Users</Label>
							<div className='space-y-3'>
								{mockUsers.map(user => (
									<div
										key={user.id}
										className='flex items-center gap-3'
									>
										<Checkbox
											id={`user-${user.id}`}
											defaultChecked={user.checked}
											className='border-slate-300'
										/>
										<div className='flex items-center gap-2'>
											<div className='flex size-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white'>
												{user.avatar}
											</div>
											<label
												htmlFor={`user-${user.id}`}
												className='text-sm text-slate-700'
											>
												{user.name}
											</label>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</ScrollArea>

				{/* Fixed Unsaved Changes at Bottom */}
				<div className='shrink-0 border-t border-slate-200 p-4'>
					<Collapsible
						open={unsavedChangesOpen}
						onOpenChange={setUnsavedChangesOpen}
					>
						<CollapsibleTrigger asChild>
							<Button
								variant='ghost'
								className='w-full justify-between p-0 hover:bg-transparent'
							>
								<div className='flex items-center gap-2'>
									<Clock className='size-4 text-indigo-600' />
									<span className='text-sm font-semibold text-slate-900'>Unsaved Changes</span>
									<div className='rounded-md bg-slate-100 px-2 py-1'>
										<span className='text-xs font-semibold text-slate-900'>12</span>
									</div>
								</div>
								<ChevronDown
									className={`size-4 text-slate-500 transition-transform ${unsavedChangesOpen ? 'rotate-180' : ''}`}
								/>
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className='mt-3'>
							<div className='space-y-3 rounded-lg border border-slate-300 bg-white p-4 shadow-sm'>
								{/* Header */}
								<div className='flex items-center justify-between border-b border-slate-200 pb-3'>
									<div className='space-y-0.5'>
										<h3 className='text-sm font-semibold text-slate-900'>Changes Summary</h3>
										<p className='text-xs text-slate-500'>Last sync: 5m ago</p>
									</div>
								</div>

								{/* Change Summary */}
								<div className='space-y-2 text-xs'>
									<div className='flex items-center justify-between'>
										<div className='flex items-center gap-2'>
											<Plus className='size-3.5 text-slate-400' />
											<span className='text-slate-700'>New</span>
										</div>
										<span className='font-semibold text-slate-900'>3</span>
									</div>

									<div className='flex items-center justify-between'>
										<div className='flex items-center gap-2'>
											<Pencil className='size-3.5 text-slate-400' />
											<span className='text-slate-700'>Modified</span>
										</div>
										<span className='font-semibold text-slate-900'>7</span>
									</div>

									<div className='flex items-center justify-between'>
										<div className='flex items-center gap-2'>
											<Trash2 className='size-3.5 text-slate-400' />
											<span className='text-slate-700'>Deleted</span>
										</div>
										<span className='font-semibold text-slate-900'>2</span>
									</div>
								</div>

								{/* Actions */}
								<div className='space-y-2 border-t border-slate-200 pt-3'>
									<Button className='h-9 w-full bg-indigo-600 text-white hover:bg-indigo-500'>
										<RefreshCw className='mr-2 size-4' />
										Sync to Jira
									</Button>
									<Button
										variant='ghost'
										className='h-9 w-full text-slate-600 hover:bg-slate-100 hover:text-slate-900'
									>
										<X className='mr-2 size-4' />
										Discard All
									</Button>
								</div>
							</div>
						</CollapsibleContent>
					</Collapsible>
				</div>
			</div>

			{/* Left Separator */}
			<DraggableSeparator onDrag={handleLeftSeparatorDrag} />

			{/* Center Calendar Area */}
			<div className='flex flex-1 flex-col overflow-hidden'>
				<div className='flex-1 overflow-auto'>
					<div className='p-4'>
						{/* Week Navigation */}
						<div className='mb-4 flex items-center justify-between'>
							<div className='flex items-center gap-2'>
								<Button
									variant='outline'
									size='icon'
									className='size-9 border-slate-300 hover:bg-slate-50'
								>
									<ChevronLeft className='size-4' />
								</Button>
								<span className='text-sm font-medium text-slate-900'>Jan 1 - Jan 7, 2024</span>
								<Button
									variant='outline'
									size='icon'
									className='size-9 border-slate-300 hover:bg-slate-50'
								>
									<ChevronRight className='size-4' />
								</Button>
								<Button
									variant='outline'
									className='ml-2 h-9 border-slate-300 px-4 hover:bg-slate-50'
								>
									Today
								</Button>
							</div>
							<div className='flex items-center gap-1 rounded-lg border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur'>
								<Button
									variant='ghost'
									className='h-8 px-3 text-slate-700'
								>
									Month
								</Button>
								<Button className='h-8 bg-indigo-600 px-3 text-white shadow-sm hover:bg-indigo-500'>
									Week
								</Button>
							</div>
						</div>

						{/* Calendar Grid */}
						<CalendarGrid events={mockEvents} />
					</div>
				</div>
			</div>

			{/* Right Separator */}
			<DraggableSeparator onDrag={handleRightSeparatorDrag} />

			{/* Right Issues Sidebar */}
			<div
				className='flex flex-col border-l border-slate-200 bg-slate-50/95 shadow-sm backdrop-blur'
				style={{ width: `${rightPanelWidth}px`, flexShrink: 0 }}
			>
				{/* Search */}
				<div className='shrink-0 border-b border-slate-200 p-4'>
					<div className='mb-3 flex items-center justify-between'>
						<h3 className='text-sm font-semibold text-slate-900'>Search Issues</h3>
					</div>
					<div className='relative'>
						<Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400' />
						<Input
							className='border-slate-300 pl-9 focus-visible:ring-indigo-500'
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
										<h4 className='text-xs font-medium uppercase tracking-wide text-slate-500'>
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
				<div className='shrink-0 border-t border-slate-200 p-4'>
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
										className='size-4 text-indigo-600'
										fill='currentColor'
										viewBox='0 0 24 24'
										role='img'
										aria-label='User icon'
									>
										<path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z' />
									</svg>
									<span className='text-sm font-semibold text-slate-900'>Quick Insights</span>
								</div>
								<ChevronDown
									className={`size-4 text-slate-500 transition-transform ${insightsOpen ? 'rotate-180' : ''}`}
								/>
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className='mt-3'>
							<div className='space-y-2 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur'>
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

// Calendar Grid Component
function CalendarGrid({ events }: { events: typeof mockEvents }) {
	const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
	const dates = [1, 2, 3, 4, 5, 6, 7]
	const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17]

	return (
		<div className='overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-sm backdrop-blur'>
			{/* Day Headers */}
			<div className='grid grid-cols-[50px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50/50'>
				<div className='border-r border-slate-200' />
				{days.map((day, idx) => (
					<div
						key={day}
						className='border-r border-slate-200 p-2 text-center last:border-r-0'
					>
						<div className='text-xs font-medium uppercase tracking-wide text-slate-500'>{day}</div>
						<div className='mt-1 text-xl font-semibold text-slate-900'>{dates[idx]}</div>
						{idx === 4 && <div className='mt-1 text-xs font-medium text-indigo-600'>Today</div>}
					</div>
				))}
			</div>

			{/* Time Grid */}
			<div className='relative'>
				{hours.map((hour, idx) => (
					<div
						key={hour}
						className='grid grid-cols-[50px_repeat(7,1fr)]'
					>
						{/* Time Label */}
						<div className='flex h-16 items-start justify-end border-b border-r border-slate-200 bg-slate-50/30 pr-2 pt-1'>
							<span className='text-xs font-medium text-slate-500'>
								{hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? 'PM' : 'AM'}
							</span>
						</div>

						{/* Day Cells */}
						{dates.map(date => (
							<div
								key={`${hour}-${date}`}
								className='relative h-16 border-b border-r border-slate-200 bg-white last:border-r-0'
							>
								{/* Render events for this time slot */}
								{events
									.filter(event => {
										const eventStart = timeToHourOffset(event.startTime)
										return event.day === date && eventStart >= idx && eventStart < idx + 1
									})
									.map(event => {
										const top = (timeToHourOffset(event.startTime) - idx) * 64
										const height = getDuration(event.startTime, event.endTime) * 64
										return (
											<EventBlock
												key={event.id}
												event={event}
												style={{
													position: 'absolute',
													top: `${top}px`,
													height: `${height}px`,
													left: '4px',
													right: '4px'
												}}
											/>
										)
									})}
							</div>
						))}
					</div>
				))}
			</div>
		</div>
	)
}

// Event Block Component
function EventBlock({
	event,
	style
}: {
	event: (typeof mockEvents)[0]
	style: React.CSSProperties
}) {
	const gradientClass = colorGradients[event.color as ColorKey]

	return (
		<div
			className={`group cursor-pointer rounded-lg border bg-gradient-to-b p-3 shadow-sm transition-all hover:shadow-md ${gradientClass}`}
			style={style}
		>
			<div className='flex items-start justify-between'>
				<div className='flex-1 overflow-hidden'>
					<p className='truncate text-xs font-semibold leading-tight'>{event.title}</p>
					<p className='mt-0.5 truncate text-xs font-bold leading-tight'>{event.project}</p>
					<p className='mt-1 text-xs leading-tight opacity-80'>
						{event.startTime} - {event.endTime}
					</p>
				</div>
				<Button
					variant='ghost'
					size='icon'
					className='size-6 opacity-0 transition-opacity group-hover:opacity-100'
				>
					<MoreVertical className='size-4' />
				</Button>
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
		Critical: 'text-rose-700 bg-rose-50 border-rose-200',
		High: 'text-amber-700 bg-amber-50 border-amber-200',
		Medium: 'text-blue-700 bg-blue-50 border-blue-200',
		Low: 'text-slate-600 bg-slate-50 border-slate-200'
	}

	const statusColors = {
		'To Do': 'text-slate-700 bg-slate-100',
		'In Progress': 'text-indigo-700 bg-indigo-100',
		'In Review': 'text-amber-700 bg-amber-100',
		Done: 'text-emerald-700 bg-emerald-100'
	}

	return (
		<div className='group cursor-grab rounded-lg border border-slate-300 bg-white p-3 shadow-sm transition-all hover:border-indigo-400 hover:shadow-md active:cursor-grabbing'>
			{/* Header Row */}
			<div className='mb-2 flex items-start gap-2'>
				<GripVertical className='mt-0.5 size-4 flex-shrink-0 text-slate-400 transition-opacity group-hover:text-slate-600' />

				<div className='flex flex-1 items-start justify-between gap-2'>
					<div className='flex items-center gap-2'>
						<span
							className='flex size-6 items-center justify-center rounded bg-slate-100 text-slate-600'
							title={sourceLabels[source]}
						>
							{sourceIcons[source]}
						</span>
						<span className='text-xs font-bold text-slate-900'>{id}</span>
					</div>

					<span
						className={`rounded border px-1.5 py-0.5 text-xs font-medium ${priorityColors[priority as keyof typeof priorityColors]}`}
					>
						{priority}
					</span>
				</div>
			</div>

			{/* Title */}
			<p className='mb-2 line-clamp-2 text-sm font-medium leading-snug text-slate-900'>{title}</p>

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
						className='rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700'
					>
						{label}
					</span>
				))}
			</div>

			{/* Assignee & Time */}
			<div className='flex items-center justify-between border-t border-slate-200 pt-2'>
				<div className='flex items-center gap-2'>
					<div className='flex size-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white'>
						{assigneeAvatar}
					</div>
					<span className='text-xs text-slate-600'>{assignee.split(' ')[0]}</span>
				</div>

				<div className='flex items-center gap-3 text-xs text-slate-500'>
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
			<span className='text-xs text-slate-600'>{label}</span>
			<span className='text-sm font-semibold text-slate-900'>{value}</span>
		</div>
	)
}

export async function loader({ request }: Route.LoaderArgs) {
	return {}
}
