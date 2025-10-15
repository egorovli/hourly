import type { ShouldRevalidateFunctionArgs } from 'react-router'
import type { Preferences } from '~/domain/preferences.ts'
import type { Route } from './+types/__._index.ts'

import { createViewDay, createViewMonthGrid, createViewWeek } from '@schedule-x/calendar'
import { createDragAndDropPlugin } from '@schedule-x/drag-and-drop'
import { createEventModalPlugin } from '@schedule-x/event-modal'
import { createEventsServicePlugin } from '@schedule-x/events-service'
import { ScheduleXCalendar, useCalendarApp } from '@schedule-x/react'
import { createResizePlugin } from '@schedule-x/resize'
// import { format } from 'date-fns'
import { DateTime } from 'luxon'
import { useCallback, useMemo, useState } from 'react'
import { redirect, useRouteLoaderData } from 'react-router'
import z from 'zod'

import { GitBranch, Users } from 'lucide-react'

import { Badge } from '~/components/shadcn/ui/badge.tsx'
import { Button } from '~/components/shadcn/ui/button.tsx'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/shadcn/ui/card.tsx'
import { Separator } from '~/components/shadcn/ui/separator.tsx'

import { DataTableToolbar } from '~/components/data-table-toolbar.tsx'
import type { FilterConfig } from '~/components/data-table-toolbar.tsx'
// import { ReportSettingsToolbar } from '~/components/report-settings-toolbar.tsx'

// Mock data for demonstration
const mockGitlabProjects = [
	{ id: '1', name: 'Frontend App', group: 'Company' },
	{ id: '2', name: 'Backend API', group: 'Company' },
	{ id: '3', name: 'Mobile App', group: 'Company' },
	{ id: '4', name: 'Infrastructure', group: 'DevOps' },
	{ id: '5', name: 'Documentation', group: 'DevOps' }
]

const mockJiraProjects = [
	{ id: 'PROJ', name: 'Main Project' },
	{ id: 'DEV', name: 'Development' },
	{ id: 'OPS', name: 'Operations' },
	{ id: 'DOCS', name: 'Documentation' }
]

const mockAuthors = [
	{ id: 'user1', name: 'John Doe', email: 'john@example.com', count: 10 },
	{ id: 'user2', name: 'Jane Smith', email: 'jane@example.com' },
	{ id: 'user3', name: 'Bob Johnson', email: 'bob@example.com' }
]

export default function DashboardPage({ loaderData }: Route.ComponentProps): React.ReactNode {
	const rootData = useRouteLoaderData<{ preferences?: Partial<Preferences> }>('root')
	// const [searchParams, setSearchParams] = useSearchParams()

	const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
		from: new Date(loaderData.query.from),
		to: loaderData.query.to ? new Date(loaderData.query.to) : undefined
	})

	const [searchQuery, setSearchQuery] = useState('')
	const [selectedGitlabProjects, setSelectedGitlabProjects] = useState<Set<string>>(new Set())
	const [selectedJiraProjects, setSelectedJiraProjects] = useState<Set<string>>(new Set())
	const [selectedAuthors, setSelectedAuthors] = useState<Set<string>>(new Set())

	// preferences are edited via modal; keep only date range for filters here

	// removed collapsible settings UI

	// Filter configurations for DataTableToolbar
	const filterConfigs: FilterConfig[] = useMemo(
		() => [
			{
				id: 'gitlab-projects',
				title: 'GitLab Projects',
				options: mockGitlabProjects.map(p => ({ label: p.name, value: p.id }))
			},
			{
				id: 'jira-projects',
				title: 'Jira Projects',
				options: mockJiraProjects.map(p => ({ label: p.name, value: p.id }))
			},
			{
				id: 'authors',
				title: 'Authors',
				options: mockAuthors.map(a => ({ label: a.name, value: a.id, count: a.count }))
			}
		],
		[]
	)

	const selectedFilters = useMemo(
		() => ({
			'gitlab-projects': selectedGitlabProjects,
			'jira-projects': selectedJiraProjects,
			authors: selectedAuthors
		}),
		[selectedGitlabProjects, selectedJiraProjects, selectedAuthors]
	)

	const handleFilterChange = useCallback((filterId: string, values: Set<string>) => {
		if (filterId === 'gitlab-projects') {
			setSelectedGitlabProjects(values)
		} else if (filterId === 'jira-projects') {
			setSelectedJiraProjects(values)
		} else if (filterId === 'authors') {
			setSelectedAuthors(values)
		}
	}, [])

	const handleResetFilters = useCallback(() => {
		setSearchQuery('')
		setSelectedGitlabProjects(new Set())
		setSelectedJiraProjects(new Set())
		setSelectedAuthors(new Set())
		setDateRange({ from: undefined, to: undefined })
	}, [])

	// Initialize Schedule-X calendar
	const eventsService = useMemo(() => createEventsServicePlugin(), [])
	const eventModal = useMemo(() => createEventModalPlugin(), [])
	const minStepMinutes = useMemo(() => {
		const mins = rootData?.preferences?.minimumDurationMinutes
		if (typeof mins === 'number' && Number.isFinite(mins)) {
			return mins
		}
		return 60
	}, [rootData?.preferences?.minimumDurationMinutes])

	const resize = useMemo(() => createResizePlugin(minStepMinutes), [minStepMinutes])
	const dragAndDrop = useMemo(() => createDragAndDropPlugin(minStepMinutes), [minStepMinutes])
	const calendar = useCalendarApp({
		theme: 'shadcn',
		views: [createViewMonthGrid(), createViewWeek(), createViewDay()],
		events: [
			// Sample events for UI demonstration
			// Timed events for plugin testing
			{
				id: '1',
				title: 'PROJ-123: Kickoff Meeting',
				start: Temporal.ZonedDateTime.from('2025-10-15T09:00:00+03:00[Europe/Moscow]'),
				end: Temporal.ZonedDateTime.from('2025-10-15T10:00:00+03:00[Europe/Moscow]')
			},
			{
				id: '2',
				title: 'PROJ-456: Implementation Block',
				start: Temporal.ZonedDateTime.from('2025-10-15T11:00:00+03:00[Europe/Moscow]'),
				end: Temporal.ZonedDateTime.from('2025-10-15T13:00:00+03:00[Europe/Moscow]')
			},
			{
				id: '3',
				title: 'Lunch',
				start: Temporal.ZonedDateTime.from('2025-10-15T13:00:00+03:00[Europe/Moscow]'),
				end: Temporal.ZonedDateTime.from('2025-10-15T14:00:00+03:00[Europe/Moscow]')
			},
			{
				id: '4',
				title: 'Client Review Call',
				start: Temporal.ZonedDateTime.from('2025-10-15T16:00:00+03:00[Europe/Moscow]'),
				end: Temporal.ZonedDateTime.from('2025-10-15T17:00:00+03:00[Europe/Moscow]')
			},
			{
				id: '5',
				title: 'OPS-12: Infra Maintenance',
				start: Temporal.ZonedDateTime.from('2025-10-16T09:30:00+03:00[Europe/Moscow]'),
				end: Temporal.ZonedDateTime.from('2025-10-16T11:00:00+03:00[Europe/Moscow]')
			},
			{
				id: '6',
				title: 'DOCS-77: Write Guide',
				start: Temporal.ZonedDateTime.from('2025-10-16T14:00:00+03:00[Europe/Moscow]'),
				end: Temporal.ZonedDateTime.from('2025-10-16T16:30:00+03:00[Europe/Moscow]')
			}
		],
		plugins: [eventsService, eventModal, resize, dragAndDrop],
		callbacks: {
			onEventUpdate() {
				/* no-op */
			},
			onBeforeEventUpdate() {
				return true
			}
		},
		selectedDate: Temporal.PlainDate.from('2025-10-14')
	})

	// timezones now live in ReportSettingsToolbar

	// handled inline via date range filter and search params

	return (
		<div className='min-h-screen bg-background'>
			<div className='flex flex-col gap-6'>
				{/* Header */}
				<div className='flex items-center justify-between'>
					<div>
						<h1 className='text-3xl font-bold tracking-tight'>Working Hours Dashboard</h1>
						<p className='mt-1 text-sm text-muted-foreground'>
							Analyze commits and generate working hours reports
						</p>
					</div>
					<Button size='lg'>
						<GitBranch className='mr-2 h-4 w-4' />
						Generate Report
					</Button>
				</div>

				{/* Filters Section */}
				{/* <Card>
					<CardContent className='pt-6'> */}
				<div className='flex flex-col gap-8'>
					<DataTableToolbar
						searchValue={searchQuery}
						onSearchChange={setSearchQuery}
						searchPlaceholder='Search tasks...'
						filters={filterConfigs}
						selectedFilters={selectedFilters}
						onFilterChange={handleFilterChange}
						dateRange={dateRange}
						onDateRangeChange={setDateRange}
						onReset={handleResetFilters}
					/>
				</div>

				{/* </CardContent>
				</Card> */}

				{/* <Separator /> */}

				{/* Calendar Section */}
				{/* <Card> */}
				{/* <CardHeader> */}
				<div className='flex items-center justify-between'>
					<div>
						<CardTitle>Working Hours Calendar</CardTitle>
						<p className='mt-1 text-sm text-muted-foreground'>
							View and manage your working hours distribution
						</p>
					</div>
					<div className='flex items-center gap-2'>
						<Badge variant='outline'>
							<Users className='mr-1 h-3 w-3' />
							{selectedAuthors.size > 0 ? selectedAuthors.size : 'All'} author
							{selectedAuthors.size !== 1 ? 's' : ''}
						</Badge>
						<Badge variant='outline'>
							<GitBranch className='mr-1 h-3 w-3' />
							{selectedGitlabProjects.size > 0 ? selectedGitlabProjects.size : 'All'} project
							{selectedGitlabProjects.size !== 1 ? 's' : ''}
						</Badge>
					</div>
				</div>
				{/* </CardHeader> */}
				{/* <CardContent> */}
				<div className='sx-react-calendar-wrapper'>
					<ScheduleXCalendar calendarApp={calendar} />
				</div>
				{/* </CardContent> */}
				{/* </Card> */}

				{/* Summary Statistics */}
				<div className='grid gap-4 md:grid-cols-3'>
					<Card>
						<CardHeader className='pb-3'>
							<CardTitle className='text-sm font-medium text-muted-foreground'>
								Total Commits
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='text-2xl font-bold'>0</div>
							<p className='mt-1 text-xs text-muted-foreground'>No data available yet</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className='pb-3'>
							<CardTitle className='text-sm font-medium text-muted-foreground'>
								Total Hours
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='text-2xl font-bold'>0h</div>
							<p className='mt-1 text-xs text-muted-foreground'>Apply filters to see hours</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className='pb-3'>
							<CardTitle className='text-sm font-medium text-muted-foreground'>
								Jira Issues
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='text-2xl font-bold'>0</div>
							<p className='mt-1 text-xs text-muted-foreground'>Linked issues will appear here</p>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}

const schema = {
	loader: {
		query: z.object({
			from: z.iso
				.date()
				.optional()
				.default(() => DateTime.now().startOf('month').toISODate()),

			to: z.iso
				.date()
				.optional()
				.default(() => DateTime.now().endOf('month').startOf('day').toISODate())
		})
	}
}

type Query = z.infer<typeof schema.loader.query>

export async function loader({ request, ...args }: Route.LoaderArgs) {
	const url = new URL(request.url)

	const query = schema.loader.query.parse({
		...Object.fromEntries(url.searchParams.entries())
	})

	await ensureCanonicalUrl({ request, query, ...args })

	return {
		query
	}
}

export function shouldRevalidate({
	formAction,
	formMethod
}: ShouldRevalidateFunctionArgs): boolean {
	// if (formAction === '/preferences' && formMethod === 'POST') {
	// 	return false
	// }

	return true
}

interface GetCanonicalURLArgs extends Route.LoaderArgs {
	query: Query
}

async function getCanonicalURL({ request, query }: GetCanonicalURLArgs): Promise<URL> {
	const url = new URL(request.url)
	const canonicalUrl = new URL(url)

	canonicalUrl.search = ''

	if (query.from) {
		canonicalUrl.searchParams.set('from', query.from)
	}

	if (query.to) {
		canonicalUrl.searchParams.set('to', query.to)
	}

	const order = ['from', 'to']

	const init = [...new Set(canonicalUrl.searchParams.keys())]
		.sort((a, b) => (order.indexOf(a) ?? -1) - (order.indexOf(b) ?? -1))
		.flatMap(key =>
			canonicalUrl.searchParams
				.getAll(key)
				.sort((a, b) => a.localeCompare(b))
				.map(value => [key, value])
		)

	canonicalUrl.search = new URLSearchParams(init).toString()
	return canonicalUrl
}

interface EnsureCanonicalURLArgs extends Route.LoaderArgs {
	query: Query
}

async function ensureCanonicalUrl({ request, ...args }: EnsureCanonicalURLArgs): Promise<void> {
	const url = new URL(request.url)
	const canonicalUrl = await getCanonicalURL({ request, ...args })

	const urlPath = [url.pathname, url.search, url.hash].join('')
	const canonicalUrlPath = [canonicalUrl.pathname, canonicalUrl.search, canonicalUrl.hash].join('')

	if (urlPath !== canonicalUrlPath) {
		throw redirect(canonicalUrlPath, 307)
	}
}
