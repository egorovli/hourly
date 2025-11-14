import type { Route } from './+types/__._index.ts'

import { useEffect, useState } from 'react'

import {
	Calendar,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Download,
	GripVertical,
	MoreVertical,
	Search,
	Zap
} from 'lucide-react'

import { Badge } from '~/components/shadcn/ui/badge.tsx'
import { Button } from '~/components/shadcn/ui/button.tsx'
import { Card, CardContent } from '~/components/shadcn/ui/card.tsx'
import { Input } from '~/components/shadcn/ui/input.tsx'
import { Label } from '~/components/shadcn/ui/label.tsx'
import { Progress } from '~/components/shadcn/ui/progress.tsx'
import { ScrollArea } from '~/components/shadcn/ui/scroll-area.tsx'
import { Separator } from '~/components/shadcn/ui/separator.tsx'
import { useHeaderActions } from '~/hooks/use-header-actions.tsx'

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '~/components/shadcn/ui/select.tsx'

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
		color: 'blue'
	},
	{
		id: 2,
		title: 'UI Design',
		project: 'PROJ-138',
		startTime: '9:00',
		endTime: '11:00',
		day: 2,
		color: 'purple'
	},
	{
		id: 3,
		title: 'API Development',
		project: 'PROJ-142',
		startTime: '10:00',
		endTime: '12:00',
		day: 1,
		color: 'blue'
	},
	{
		id: 4,
		title: 'API Development',
		project: 'PROJ-142',
		startTime: '10:00',
		endTime: '13:00',
		day: 3,
		color: 'blue'
	},
	{
		id: 5,
		title: 'Testing',
		project: 'PROJ-156',
		startTime: '10:00',
		endTime: '11:30',
		day: 4,
		color: 'orange'
	},
	{
		id: 6,
		title: 'Code Review',
		project: 'PROJ-149',
		startTime: '11:00',
		endTime: '12:00',
		day: 1,
		color: 'green'
	},
	{
		id: 7,
		title: 'Code Review',
		project: 'PROJ-149',
		startTime: '11:00',
		endTime: '12:30',
		day: 2,
		color: 'green'
	},
	{
		id: 8,
		title: 'API Development',
		project: 'PROJ-142',
		startTime: '13:00',
		endTime: '15:00',
		day: 1,
		color: 'blue'
	},
	{
		id: 9,
		title: 'API Development',
		project: 'PROJ-142',
		startTime: '13:00',
		endTime: '16:00',
		day: 2,
		color: 'blue'
	},
	{
		id: 10,
		title: 'UI Design',
		project: 'PROJ-138',
		startTime: '13:00',
		endTime: '15:00',
		day: 3,
		color: 'purple'
	},
	{
		id: 11,
		title: 'Testing',
		project: 'PROJ-156',
		startTime: '13:00',
		endTime: '14:00',
		day: 4,
		color: 'orange'
	},
	{
		id: 12,
		title: 'Meetings',
		project: 'PROJ-151',
		startTime: '14:00',
		endTime: '16:00',
		day: 3,
		color: 'pink'
	},
	{
		id: 13,
		title: 'UI Design',
		project: 'PROJ-138',
		startTime: '15:00',
		endTime: '17:00',
		day: 1,
		color: 'purple'
	}
]

const mockIssues = [
	{
		id: 'PROJ-142',
		title: 'Implement user authentication',
		badge: 'Backend',
		badgeColor: 'blue',
		time: '12h detected'
	},
	{
		id: 'PROJ-138',
		title: 'Design dashboard mockups',
		badge: 'Design',
		badgeColor: 'purple',
		time: ''
	},
	{
		id: 'PROJ-156',
		title: 'Fix mobile responsive issues',
		badge: 'Frontend',
		badgeColor: 'orange',
		time: ''
	}
]

const mockActivityIssues = [
	{
		id: 'PROJ-149',
		title: 'API rate limiting',
		badge: 'Backend',
		badgeColor: 'blue',
		time: '12h detected'
	},
	{
		id: 'PROJ-151',
		title: 'Database optimization',
		badge: 'Backend',
		badgeColor: 'blue',
		time: '8h detected'
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

// Color gradient mappings
const colorGradients = {
	blue: 'from-blue-100 to-blue-200 border-blue-300 text-blue-800',
	purple: 'from-purple-100 to-purple-200 border-purple-300 text-purple-800',
	orange: 'from-orange-100 to-orange-200 border-orange-300 text-orange-800',
	green: 'from-green-100 to-green-200 border-green-300 text-green-800',
	pink: 'from-pink-100 to-pink-200 border-pink-300 text-pink-800'
}

type ColorKey = keyof typeof colorGradients

export default function POCRoute({ loaderData }: Route.ComponentProps) {
	const [insightsOpen, setInsightsOpen] = useState(true)
	const { setActions } = useHeaderActions()

	useEffect(() => {
		setActions(
			<>
				<Button
					variant='outline'
					size='sm'
				>
					<Download className='mr-2 size-4' />
					Export
				</Button>
				<Button
					size='sm'
					className='bg-gray-900 text-white hover:bg-gray-800'
				>
					<Zap className='mr-2 size-4' />
					Auto Reconcile
				</Button>
			</>
		)

		return () => {
			setActions(null)
		}
	}, [setActions])

	return (
		<div className='flex h-full flex-1 overflow-hidden'>
			{/* Center Content Area */}
			<div className='flex flex-1 flex-col overflow-hidden'>
				{/* Filters Panel */}
				<div className='border-b border-gray-200 bg-white p-6'>
					<div className='mb-6 grid grid-cols-2 gap-4'>
						<div className='space-y-2'>
							<Label className='text-sm font-medium text-gray-700'>Date Range</Label>
							<div className='flex gap-2'>
								<div className='relative flex-1'>
									<Input
										className='pl-9'
										placeholder='01/01/2024'
										defaultValue='01/01/2024'
										type='text'
									/>
									<Calendar className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400' />
								</div>
								<div className='relative flex-1'>
									<Input
										className='pl-9'
										placeholder='01/07/2024'
										defaultValue='01/07/2024'
										type='text'
									/>
									<Calendar className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400' />
								</div>
							</div>
						</div>

						<div className='space-y-2'>
							<Label className='text-sm font-medium text-gray-700'>
								Projects <span className='text-xs text-gray-500'>(affects Users)</span>
							</Label>
							<Select defaultValue='all'>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>All Projects</SelectItem>
									<SelectItem value='proj-1'>Website Redesign</SelectItem>
									<SelectItem value='proj-2'>Mobile App</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Loading State */}
					<div className='mt-4 space-y-2 rounded-lg border border-indigo-200 bg-indigo-50 p-4'>
						<div className='flex items-center justify-between'>
							<span className='text-sm font-medium text-indigo-900'>Loading Data</span>
							<span className='text-sm font-semibold text-indigo-900'>73%</span>
						</div>
						<Progress
							value={73}
							className='h-2'
						/>
						<p className='text-xs text-indigo-700'>Loading worklogs: 1,247 entries</p>
					</div>

					{/* Unsaved Changes */}
					<div className='mt-4 space-y-3 rounded-lg border border-orange-200 bg-orange-50 p-4'>
						<p className='text-sm font-medium text-orange-900'>Unsaved Changes</p>
						<div className='grid grid-cols-3 gap-4 text-xs'>
							<div className='flex justify-between'>
								<span className='text-orange-700'>New entries</span>
								<span className='font-semibold text-orange-900'>3</span>
							</div>
							<div className='flex justify-between'>
								<span className='text-orange-700'>Modified</span>
								<span className='font-semibold text-orange-900'>7</span>
							</div>
							<div className='flex justify-between'>
								<span className='text-orange-700'>Deleted</span>
								<span className='font-semibold text-orange-900'>2</span>
							</div>
						</div>
						<Button className='w-full bg-gradient-to-b from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700'>
							<svg
								className='mr-2 size-4'
								fill='none'
								stroke='currentColor'
								strokeWidth={2}
								viewBox='0 0 24 24'
								role='img'
								aria-label='Sync icon'
							>
								<path
									d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
									strokeLinecap='round'
									strokeLinejoin='round'
								/>
							</svg>
							Sync Changes
						</Button>
					</div>
				</div>

				{/* Calendar View */}
				<div className='flex-1 overflow-auto'>
					<div className='p-6'>
						{/* Week Navigation */}
						<div className='mb-4 flex items-center justify-between'>
							<div className='flex items-center gap-2'>
								<Button
									variant='outline'
									size='icon'
									className='size-8'
								>
									<ChevronLeft className='size-4' />
								</Button>
								<span className='text-sm font-medium text-gray-900'>Jan 1 - Jan 7, 2024</span>
								<Button
									variant='outline'
									size='icon'
									className='size-8'
								>
									<ChevronRight className='size-4' />
								</Button>
								<Button
									variant='outline'
									size='sm'
									className='ml-2'
								>
									Today
								</Button>
							</div>
							<div className='flex items-center gap-1 rounded-lg border border-gray-200 p-1'>
								<Button
									variant='ghost'
									size='sm'
									className='h-7'
								>
									Month
								</Button>
								<Button
									size='sm'
									className='h-7 bg-gray-900 text-white hover:bg-gray-800'
								>
									Week
								</Button>
							</div>
						</div>

						{/* Calendar Grid */}
						<CalendarGrid events={mockEvents} />
					</div>
				</div>
			</div>

			{/* Right Sidebar */}
			<div className='w-80 flex-shrink-0 border-l border-gray-200 bg-gray-50'>
				<div className='flex h-full flex-col'>
					{/* Search */}
					<div className='border-b border-gray-200 p-4'>
						<div className='mb-3 flex items-center justify-between'>
							<h3 className='text-sm font-semibold text-gray-900'>Search Issues</h3>
						</div>
						<div className='relative'>
							<Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400' />
							<Input
								className='pl-9'
								placeholder='Find issues to log time...'
							/>
						</div>
					</div>

					{/* Issues */}
					<ScrollArea className='flex-1'>
						<div className='space-y-4 p-4'>
							<div>
								<h4 className='mb-3 text-xs font-medium uppercase tracking-wide text-gray-500'>
									Relevant Issues
								</h4>
								<div className='space-y-2'>
									{mockIssues.map(issue => (
										<IssueCard
											key={issue.id}
											{...issue}
										/>
									))}
								</div>
							</div>

							<Separator />

							<div>
								<h4 className='mb-3 text-xs font-medium uppercase tracking-wide text-gray-500'>
									From Activity Data
								</h4>
								<div className='space-y-2'>
									{mockActivityIssues.map(issue => (
										<IssueCard
											key={issue.id}
											{...issue}
										/>
									))}
								</div>
							</div>
						</div>
					</ScrollArea>

					{/* Quick Insights */}
					<div className='border-t border-gray-200 p-4'>
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
											className='size-4'
											fill='currentColor'
											viewBox='0 0 24 24'
											role='img'
											aria-label='User icon'
										>
											<path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z' />
										</svg>
										<span className='text-sm font-semibold text-gray-900'>Quick Insights</span>
									</div>
									<ChevronDown
										className={`size-4 text-gray-500 transition-transform ${insightsOpen ? 'rotate-180' : ''}`}
									/>
								</Button>
							</CollapsibleTrigger>
							<CollapsibleContent className='mt-3'>
								<div className='space-y-2 rounded-lg border border-gray-200 bg-white p-3'>
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
		</div>
	)
}

// Calendar Grid Component
function CalendarGrid({ events }: { events: typeof mockEvents }) {
	const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
	const dates = [1, 2, 3, 4, 5, 6, 7]
	const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17]

	return (
		<div className='rounded-lg border border-gray-200 bg-white'>
			{/* Day Headers */}
			<div className='grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200'>
				<div className='border-r border-gray-200' />
				{days.map((day, idx) => (
					<div
						key={day}
						className='border-r border-gray-200 p-4 text-center last:border-r-0'
					>
						<div className='text-xs font-medium uppercase tracking-wide text-gray-500'>{day}</div>
						<div className='mt-1 text-2xl font-semibold text-gray-900'>{dates[idx]}</div>
						{idx === 4 && <div className='mt-1 text-xs font-medium text-indigo-600'>Today</div>}
					</div>
				))}
			</div>

			{/* Time Grid */}
			<div className='relative'>
				{hours.map((hour, idx) => (
					<div
						key={hour}
						className='grid grid-cols-[60px_repeat(7,1fr)]'
					>
						{/* Time Label */}
						<div className='flex h-20 items-start justify-end border-b border-r border-gray-200 pr-3 pt-1'>
							<span className='text-xs font-medium text-gray-500'>
								{hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? 'PM' : 'AM'}
							</span>
						</div>

						{/* Day Cells */}
						{dates.map(date => (
							<div
								key={`${hour}-${date}`}
								className='relative h-20 border-b border-r border-gray-200 last:border-r-0'
							>
								{/* Render events for this time slot */}
								{events
									.filter(event => {
										const eventStart = timeToHourOffset(event.startTime)
										return event.day === date && eventStart >= idx && eventStart < idx + 1
									})
									.map(event => {
										const top = (timeToHourOffset(event.startTime) - idx) * 80
										const height = getDuration(event.startTime, event.endTime) * 80
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
					<p className='truncate text-xs font-semibold'>{event.title}</p>
					<p className='mt-0.5 text-xs font-bold'>{event.project}</p>
					<p className='mt-1 text-xs'>
						{event.startTime} - {event.endTime}
					</p>
				</div>
				<Button
					variant='ghost'
					size='icon'
					className='size-5 opacity-0 transition-opacity group-hover:opacity-100'
				>
					<MoreVertical className='size-3' />
				</Button>
			</div>
		</div>
	)
}

// Issue Card Component
function IssueCard({
	id,
	title,
	badge,
	badgeColor,
	time
}: {
	id: string
	title: string
	badge: string
	badgeColor: string
	time: string
}) {
	const badgeColors: Record<string, string> = {
		blue: 'bg-blue-500 text-white',
		orange: 'bg-orange-500 text-white',
		purple: 'bg-purple-500 text-white'
	}

	return (
		<Card className='cursor-pointer transition-colors hover:border-indigo-300'>
			<CardContent className='p-3'>
				<div className='mb-2 flex items-start justify-between'>
					<span className='text-xs font-semibold text-gray-900'>{id}</span>
					<Button
						variant='ghost'
						size='icon'
						className='size-5 -mr-1 -mt-1'
					>
						<GripVertical className='size-3 text-gray-400' />
					</Button>
				</div>
				<p className='mb-2 text-sm text-gray-700'>{title}</p>
				<div className='flex items-center justify-between'>
					<Badge className={`text-xs ${badgeColors[badgeColor]}`}>{badge}</Badge>
					{time && <span className='text-xs text-gray-500'>{time}</span>}
				</div>
			</CardContent>
		</Card>
	)
}

// Insight Row Component
function InsightRow({ label, value }: { label: string; value: string }) {
	return (
		<div className='flex items-center justify-between py-1'>
			<span className='text-xs text-gray-600'>{label}</span>
			<span className='text-sm font-semibold text-gray-900'>{value}</span>
		</div>
	)
}

export async function loader({ request }: Route.LoaderArgs) {
	return {}
}
