import type { FilterConfig } from '~/components/data-table-toolbar.tsx'
import type { Route } from './+types/__._index.ts'

import { createViewMonthGrid, createViewWeek } from '@schedule-x/calendar'
import { createDragAndDropPlugin } from '@schedule-x/drag-and-drop'
import { createEventModalPlugin } from '@schedule-x/event-modal'
import { createEventsServicePlugin } from '@schedule-x/events-service'
import { ScheduleXCalendar, useCalendarApp } from '@schedule-x/react'
import { createResizePlugin } from '@schedule-x/resize'
import { GitBranch, Users } from 'lucide-react'
import { DateTime } from 'luxon'
import { Suspense, use, useCallback, useMemo, useState } from 'react'
import { redirect, useSearchParams } from 'react-router'
import { z } from 'zod'

import { DataTableToolbar } from '~/components/data-table-toolbar.tsx'
import { Badge } from '~/components/shadcn/ui/badge.tsx'
import { Button } from '~/components/shadcn/ui/button.tsx'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/shadcn/ui/card.tsx'

import { AtlassianClient, type JiraProject } from '~/lib/atlassian/index.ts'
import { GitLabClient } from '~/lib/gitlab/index.ts'
import { orm, Token } from '~/lib/mikro-orm/index.ts'
import { getSession } from '~/lib/session/storage.ts'

const mockAuthors = [
	{ id: 'user1', name: 'John Doe', email: 'john@example.com', count: 10 },
	{ id: 'user2', name: 'Jane Smith', email: 'jane@example.com' },
	{ id: 'user3', name: 'Bob Johnson', email: 'bob@example.com' }
]

// Infer Schedule-X event element type from the React hook config
type CalendarConfig = Parameters<typeof useCalendarApp>[0]
type SxEventsArray = NonNullable<CalendarConfig['events']>
type SxEvent = SxEventsArray[number]

// For loader/serialization, allow string values for start/end which will be
// converted back to Temporal in the view component.
type SerializableEvent = Omit<SxEvent, 'start' | 'end'> & {
	start: string
	end: string
}

// Color palette used for Jira projects; assignment is index-based and cycles
type ColorDefinition = { main: string; container: string; onContainer: string }
const PROJECT_COLOR_PALETTE: Array<{ light: ColorDefinition; dark: ColorDefinition }> = [
	{
		light: { main: '#1c7df9', container: '#d2e7ff', onContainer: '#002859' },
		dark: { main: '#c0dfff', container: '#426aa2', onContainer: '#dee6ff' }
	},
	{
		light: { main: '#f91c45', container: '#ffd2dc', onContainer: '#59000d' },
		dark: { main: '#ffc0cc', container: '#a24258', onContainer: '#ffdee6' }
	},
	{
		light: { main: '#1cf9b0', container: '#dafff0', onContainer: '#004d3d' },
		dark: { main: '#c0fff5', container: '#42a297', onContainer: '#e6fff5' }
	},
	{
		light: { main: '#f9d71c', container: '#fff5aa', onContainer: '#594800' },
		dark: { main: '#fff5c0', container: '#a29742', onContainer: '#fff5de' }
	}
]

function getProjectColorsByIndex(index: number): { light: ColorDefinition; dark: ColorDefinition } {
	const fallback: { light: ColorDefinition; dark: ColorDefinition } = {
		light: { main: '#1c7df9', container: '#d2e7ff', onContainer: '#002859' },
		dark: { main: '#c0dfff', container: '#426aa2', onContainer: '#dee6ff' }
	}
	const palette = PROJECT_COLOR_PALETTE.length > 0 ? PROJECT_COLOR_PALETTE : [fallback]
	const idx = index % palette.length
	const picked = palette[idx]
	return picked ?? fallback
}

/**
 * Generate fake events based on selected Jira project IDs
 */
async function generateFakeEvents(projectIds: string[]): Promise<SerializableEvent[]> {
	// Simulate network delay
	await new Promise(resolve => setTimeout(resolve, 1500))

	if (projectIds.length === 0) {
		return [
			{
				id: '1',
				title: 'Select Jira projects to see events',
				start: Temporal.ZonedDateTime.from('2025-10-15T09:00:00+03:00[Europe/Moscow]').toString(),
				end: Temporal.ZonedDateTime.from('2025-10-15T10:00:00+03:00[Europe/Moscow]').toString()
			}
		]
	}

	const events: SerializableEvent[] = []
	let eventId = 1

	// Generate events for each selected project
	projectIds.forEach((projectId, projectIndex) => {
		const baseDate = DateTime.fromISO('2025-10-15').plus({ days: projectIndex })

		// Generate 2-3 events per project
		const eventCount = 2 + Math.floor(Math.random() * 2)

		for (let i = 0; i < eventCount; i++) {
			const startHour = 9 + i * 3
			const duration = 1 + Math.floor(Math.random() * 2) // 1-2 hours

			events.push({
				id: `${eventId}`,
				title: `${projectId}-${100 + eventId}: Task ${eventId}`,
				calendarId: projectId,
				start: Temporal.ZonedDateTime.from(
					`${baseDate.toISODate()}T${startHour.toString().padStart(2, '0')}:00:00+03:00[Europe/Moscow]`
				).toString(),
				end: Temporal.ZonedDateTime.from(
					`${baseDate.toISODate()}T${(startHour + duration).toString().padStart(2, '0')}:00:00+03:00[Europe/Moscow]`
				).toString()
			})

			eventId++
		}
	})

	return events
}

/**
 * Calendar component that renders the Schedule-X calendar with events
 * Uses React 19's use() hook to unwrap the promise from the loader
 */
function CalendarView({ eventsPromise }: { eventsPromise: Promise<SerializableEvent[]> }) {
	// Use React 19's use() hook to unwrap the promise
	const events = use(eventsPromise)

	const eventsService = useMemo(() => createEventsServicePlugin(), [])
	const eventModal = useMemo(() => createEventModalPlugin(), [])
	const resize = useMemo(() => createResizePlugin(15), [])
	const dragAndDrop = useMemo(() => createDragAndDropPlugin(15), [])

	// Convert serialized event dates back to Temporal objects
	type MaterializedEvent = Omit<SxEvent, 'start' | 'end'> & {
		start: Temporal.PlainDate | Temporal.ZonedDateTime
		end: Temporal.PlainDate | Temporal.ZonedDateTime
	}
	const calendarEvents = useMemo<MaterializedEvent[]>(
		() =>
			events.map(event => ({
				...event,
				start:
					typeof event.start === 'string' ? Temporal.ZonedDateTime.from(event.start) : event.start,
				end: typeof event.end === 'string' ? Temporal.ZonedDateTime.from(event.end) : event.end
			})) as MaterializedEvent[],
		[events]
	)

	// Build calendars config based on calendarIds present in events
	const calendars = useMemo(() => {
		const ids = Array.from(
			new Set(
				calendarEvents
					.map(e => (typeof e['calendarId'] === 'string' ? (e['calendarId'] as string) : undefined))
					.filter(Boolean)
			)
		) as string[]

		const conf: Record<
			string,
			{ colorName: string; lightColors: ColorDefinition; darkColors: ColorDefinition }
		> = {}
		ids.forEach((id, index) => {
			const c = getProjectColorsByIndex(index)
			conf[id] = {
				colorName: id,
				lightColors: c.light,
				darkColors: c.dark
			}
		})

		return conf
	}, [calendarEvents])

	const calendar = useCalendarApp({
		theme: 'shadcn',
		views: [createViewMonthGrid(), createViewWeek()],
		events: calendarEvents as unknown as SxEventsArray,
		calendars,
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

	return (
		<div className='sx-react-calendar-wrapper'>
			<ScheduleXCalendar calendarApp={calendar} />
		</div>
	)
}

export default function DashboardPage({ loaderData }: Route.ComponentProps): React.ReactNode {
	const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
		from: new Date(loaderData.query.from),
		to: loaderData.query.to ? new Date(loaderData.query.to) : undefined
	})

	const [searchQuery, setSearchQuery] = useState('')
	const [selectedGitlabProjects, setSelectedGitlabProjects] = useState<Set<string>>(new Set())

	const [selectedJiraProjects, setSelectedJiraProjects] = useState<Set<string>>(
		new Set(loaderData.query['jira-project-id'] ?? [])
	)

	const [selectedAuthors, setSelectedAuthors] = useState<Set<string>>(new Set())
	const [, setSearchParams] = useSearchParams()

	// Filter configurations for DataTableToolbar
	const filterConfigs: FilterConfig[] = useMemo(
		() => [
			{
				id: 'gitlab-projects',
				title: 'GitLab Projects',
				options: loaderData.gitlab.projects.map(p => ({ label: p.name, value: p.id.toString(10) }))
			},
			{
				id: 'jira-projects',
				title: 'Jira Projects',
				options: [],
				groups: loaderData.jira.resources.map(res => ({
					label: res.name,
					options:
						loaderData.jira.projects[res.id]?.map(p => ({ label: p.name, value: p.id })) ?? []
				}))
			},
			{
				id: 'authors',
				title: 'Authors',
				options: mockAuthors.map(a => ({ label: a.name, value: a.id, count: a.count }))
			}
		],
		[loaderData.gitlab.projects, loaderData.jira.resources, loaderData.jira.projects]
	)

	const selectedFilters = useMemo(
		() => ({
			'gitlab-projects': selectedGitlabProjects,
			'jira-projects': selectedJiraProjects,
			authors: selectedAuthors
		}),
		[selectedGitlabProjects, selectedJiraProjects, selectedAuthors]
	)

	const handleFilterChange = useCallback(
		(filterId: string, values: Set<string>) => {
			switch (filterId) {
				case 'gitlab-projects':
					setSelectedGitlabProjects(values)
					break

				case 'jira-projects':
					setSelectedJiraProjects(values)

					setSearchParams(prev => {
						const params = new URLSearchParams(prev)

						params.delete('jira-project-id')

						values.forEach(value => {
							params.append('jira-project-id', value)
						})

						return params
					})
					break

				case 'authors':
					setSelectedAuthors(values)
					break
			}
		},
		[setSearchParams]
	)

	const handleResetFilters = useCallback(() => {
		setSearchQuery('')
		setSelectedGitlabProjects(new Set())
		setSelectedJiraProjects(new Set())
		setSelectedAuthors(new Set())
		setDateRange({ from: undefined, to: undefined })
	}, [])

	// Map Jira project id -> name for legend
	const jiraProjectIdToName = useMemo(() => {
		const map = new Map<string, string>()
		for (const res of loaderData.jira.resources) {
			const arr = loaderData.jira.projects[res.id] ?? []
			for (const p of arr) {
				map.set(p.id, p.name)
			}
		}
		return map
	}, [loaderData.jira.resources, loaderData.jira.projects])

	const legendItems = useMemo(() => {
		const arr = Array.from(selectedJiraProjects)
		return arr.map((id, index) => ({
			id,
			name: jiraProjectIdToName.get(id) ?? id,
			colors: getProjectColorsByIndex(index)
		}))
	}, [selectedJiraProjects, jiraProjectIdToName])

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

				{legendItems.length > 0 ? (
					<div className='mt-2 flex flex-wrap items-center gap-3'>
						{legendItems.map(item => (
							<div
								key={item.id}
								className='flex items-center gap-2 text-xs text-muted-foreground'
							>
								<span
									className='h-3 w-3 rounded'
									style={{ backgroundColor: item.colors.light.main }}
								/>
								<span>{item.name}</span>
							</div>
						))}
					</div>
				) : null}

				<Suspense
					// key={loaderData.query['jira-project-id']?.join(',') ?? 'no-projects'}
					fallback={
						<div className='sx-react-calendar-wrapper flex items-center justify-center rounded-lg border border-dashed p-12'>
							<div className='text-center'>
								<div className='mb-2 text-sm font-medium'>Loading calendar events...</div>
								<div className='text-xs text-muted-foreground'>
									Fetching events based on selected Jira projects
								</div>
							</div>
						</div>
					}
				>
					<CalendarView eventsPromise={loaderData.events} />
				</Suspense>

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

				{/* <div className='mt-6'>
					<Collapsible>
						<div className='flex items-center justify-between'>
							<div className='flex items-center gap-2'>
								<Bug className='h-4 w-4 text-muted-foreground' />
								<span className='text-sm font-medium text-muted-foreground'>Debug</span>
							</div>
							<CollapsibleTrigger asChild>
								<Button
									variant='outline'
									size='sm'
								>
									Toggle
								</Button>
							</CollapsibleTrigger>
						</div>
						<CollapsibleContent>
							<Card className='mt-3'>
								<CardContent>
									<pre className='max-h-64 overflow-auto rounded-md bg-muted p-4 text-xs'>
										<code>{JSON.stringify({ loaderData }, null, 2)}</code>
									</pre>
								</CardContent>
							</Card>
						</CollapsibleContent>
					</Collapsible>
				</div> */}
			</div>
		</div>
	)
}

const schema = {
	loader: {
		query: z.object({
			'from': z.iso
				.date()
				.optional()
				.default(() => DateTime.now().startOf('month').toISODate()),

			'to': z.iso
				.date()
				.optional()
				.default(() => DateTime.now().endOf('month').startOf('day').toISODate()),

			'jira-project-id': z.string().array().optional()
		})
	}
}

type Query = z.infer<typeof schema.loader.query>

export async function loader({ request, ...args }: Route.LoaderArgs) {
	const url = new URL(request.url)

	const query = schema.loader.query.parse({
		...Object.fromEntries(url.searchParams.entries()),
		'jira-project-id': url.searchParams.getAll('jira-project-id')
	})

	await ensureCanonicalUrl({ request, query, ...args })

	const session = await getSession(request.headers.get('Cookie'))
	const user = session.get('user')

	if (!user?.gitlab?.id) {
		throw new Error('GitLab profile ID not found')
	}

	if (!user?.atlassian?.id) {
		throw new Error('Atlassian profile ID not found')
	}

	const em = orm.em.fork()

	async function getGitlabProjects(profileId: string) {
		const token = await em.findOne(Token, { profileId, provider: 'gitlab' })

		if (!token?.accessToken) {
			throw new Error('GitLab access token not found')
		}

		const client = new GitLabClient({
			accessToken: token.accessToken,
			refreshToken: token.refreshToken
		})

		const projects = await client.listAllProjects({
			membership: true,
			withShared: false
		})

		return {
			projects: projects.map(p => ({ id: p.id, name: p.name }))
		}
	}

	async function getJiraProjects(profileId: string) {
		const token = await em.findOne(Token, { profileId, provider: 'atlassian' })

		if (!token?.accessToken) {
			throw new Error('Atlassian access token not found')
		}

		const client = new AtlassianClient({
			accessToken: token.accessToken,
			refreshToken: token.refreshToken
		})

		const resources = await client.getAccessibleResources()
		const projects: Record<string, JiraProject[]> = {}

		for (const res of resources) {
			const { projects: prjs } = await client.listJiraProjects(res.id, { maxResults: 100 })
			projects[res.id] = prjs
		}

		return {
			resources,
			projects
		}
	}

	const [gitlab, jira] = await Promise.all([
		getGitlabProjects(user.gitlab.id),
		getJiraProjects(user.atlassian.id)
	])

	// Return events as a deferred promise (don't await)
	const eventsPromise = generateFakeEvents(query['jira-project-id'] ?? [])

	return {
		query,
		gitlab,
		jira,
		events: eventsPromise
	}
}

// export function shouldRevalidate({
// 	formAction,
// 	formMethod
// }: ShouldRevalidateFunctionArgs): boolean {
// 	// if (formAction === '/preferences' && formMethod === 'POST') {
// 	// 	return false
// 	// }

// 	return true
// }

interface GetCanonicalURLArgs extends Route.LoaderArgs {
	query: Query
}

async function getCanonicalURL({ request, query }: GetCanonicalURLArgs): Promise<URL> {
	const url = new URL(request.url)
	const canonicalUrl = new URL(url)

	const searchParams = new URLSearchParams([
		...(query.from ? [['from', query.from]] : []),
		...(query.to ? [['to', query.to]] : []),
		...(query['jira-project-id'] ? query['jira-project-id'].map(id => ['jira-project-id', id]) : [])
	])

	const order = ['from', 'to', 'jira-project-id']

	const init = [...new Set(searchParams.keys())]
		.sort((a, b) => (order.indexOf(a) ?? -1) - (order.indexOf(b) ?? -1))
		.flatMap(key =>
			searchParams
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
