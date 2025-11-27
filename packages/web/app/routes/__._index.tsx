import type { Route } from './+types/__._index.ts'
import type { Route as ParentRoute } from './+types/__.ts'
import type { ProjectOption, ProjectOptionGroup } from '~/components/project-multi-select.tsx'
import type { UserOption } from '~/components/user-multi-select.tsx'
import type { MetaDescriptor } from 'react-router'
import type { WorklogAuthor } from '~/domain/entities/worklog-author.ts'
import type { WorklogEntity } from '~/domain/entities/worklog-entity.ts'
import type { WorklogProject } from '~/modules/worklogs/domain/worklog-project.ts'
import type { WorklogProjectCategory } from '~/modules/worklogs/domain/worklog-project-category.ts'

import { useEffect, useState, lazy, Suspense, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouteLoaderData } from 'react-router'

import { DebugPanel } from '~/components/debug-panel.tsx'
import { ProjectMultiSelect } from '~/components/project-multi-select.tsx'
import { UserMultiSelect } from '~/components/user-multi-select.tsx'

const Calendar = lazy(() =>
	import('~/components/calendar/index.tsx').then(m => ({ default: m.Calendar }))
)

function groupProjectsByCategory(projects: WorklogProject[]): {
	categorized: Map<string, { category: WorklogProjectCategory; projects: WorklogProject[] }>
	uncategorized: WorklogProject[]
} {
	const categorized = new Map<
		string,
		{ category: WorklogProjectCategory; projects: WorklogProject[] }
	>()
	const uncategorized: WorklogProject[] = []

	for (const project of projects) {
		if (project.category) {
			const existing = categorized.get(project.category.id) ?? {
				category: project.category,
				projects: []
			}
			existing.projects.push(project)
			categorized.set(project.category.id, existing)
		} else {
			uncategorized.push(project)
		}
	}

	const sortByActive = (a: WorklogProject, b: WorklogProject) => {
		const aInactive = a.isActive === false ? 1 : 0
		const bInactive = b.isActive === false ? 1 : 0
		return aInactive - bInactive
	}

	for (const entry of categorized.values()) {
		entry.projects.sort(sortByActive)
	}

	uncategorized.sort(sortByActive)

	return { categorized, uncategorized }
}

function buildWorkspaceOption(workspace: WorklogProject): ProjectOptionGroup | undefined {
	const projects = workspace.children ?? []
	if (projects.length === 0) {
		return undefined
	}

	const { categorized, uncategorized } = groupProjectsByCategory(projects)
	const children: ProjectOption[] = []

	for (const { category, projects: categoryProjects } of categorized.values()) {
		children.push({
			id: `category:${category.id}:${workspace.id}`,
			label: category.name,
			children: categoryProjects.map(project => ({
				id: `project:${project.id}`,
				value: `project:${project.id}`,
				label: project.name,
				key: project.key,
				avatarUrl: project.avatarUrl,
				archived: project.isActive === false
			}))
		})
	}

	for (const project of uncategorized) {
		children.push({
			id: `project:${project.id}`,
			value: `project:${project.id}`,
			label: project.name,
			key: project.key,
			avatarUrl: project.avatarUrl,
			archived: project.isActive === false
		})
	}

	if (children.length === 0) {
		return undefined
	}

	return {
		id: workspace.id,
		label: workspace.name,
		avatarUrl: workspace.avatarUrl,
		children
	}
}

function buildProjectOptions(workspaces: WorklogProject[]): ProjectOption[] {
	const options: ProjectOption[] = []

	for (const workspace of workspaces) {
		const option = buildWorkspaceOption(workspace)
		if (option) {
			options.push(option)
		}
	}

	return options
}

interface WorklogEntriesResponse {
	worklogs: WorklogEntity[]
	total: number
	pageSize: number
	hasMore: boolean
}

interface UsersResponse {
	users: WorklogAuthor[]
}

function buildUserOptions(users: WorklogAuthor[]): UserOption[] {
	return users.map(user => ({
		id: user.id,
		value: user.id,
		label: user.name,
		email: user.email,
		avatarUrl: user.avatarUrl,
		active: user.isActive
	}))
}

export default function CalendarPage(): React.ReactNode {
	const [displayCalendar, setDisplayCalendar] = useState(false)
	const [selectedProjects, setSelectedProjects] = useState<string[]>([])
	const [selectedUsers, setSelectedUsers] = useState<string[]>([])
	const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | undefined>(undefined)

	const parentLoaderData = useRouteLoaderData<ParentRoute.ComponentProps['loaderData']>('routes/__')

	// Fetch projects using TanStack Query
	const { data: projectsData, isLoading: isLoadingProjects } = useQuery<{
		projects: WorklogProject[]
	}>({
		queryKey: ['worklog-projects'],
		queryFn: async ({ signal }) => {
			const response = await fetch('/worklog/projects', {
				signal
			})
			if (!response.ok) {
				throw new Error(`Failed to fetch projects: ${response.statusText}`)
			}
			return response.json() as Promise<{ projects: WorklogProject[] }>
		}
	})

	const projects = projectsData?.projects ?? []

	const projectOptions = useMemo(() => buildProjectOptions(projects), [projects])

	// Build query params for users - only fetch users for selected projects
	const usersQueryParams = useMemo(() => {
		const params = new URLSearchParams()

		// Only fetch users if projects are selected
		if (selectedProjects.length > 0) {
			// Add multiple project-id parameters (singular)
			for (const projectId of selectedProjects) {
				params.append('project-id', projectId)
			}
		}

		return params.toString()
	}, [selectedProjects])

	// Fetch users using TanStack Query - only when projects are selected
	const { data: usersData, isLoading: isLoadingUsers } = useQuery<UsersResponse>({
		queryKey: ['worklog-users', usersQueryParams],
		queryFn: async ({ signal }) => {
			const response = await fetch(`/worklog/users?${usersQueryParams}`, {
				signal
			})
			if (!response.ok) {
				throw new Error(`Failed to fetch users: ${response.statusText}`)
			}
			return response.json() as Promise<UsersResponse>
		},
		enabled: selectedProjects.length > 0
	})

	const userOptions = useMemo(() => buildUserOptions(usersData?.users ?? []), [usersData?.users])

	// Build query params for worklog entries
	const queryParams = useMemo(() => {
		const params = new URLSearchParams()
		params.set('page-size', '100')

		// Add date range if available
		if (dateRange) {
			params.set('started-after', Math.floor(dateRange.start.getTime()).toString())
			params.set('started-before', Math.floor(dateRange.end.getTime()).toString())
		}

		// Add multiple project-id parameters (singular)
		for (const projectId of selectedProjects) {
			params.append('project-id', projectId)
		}

		// Add multiple user-id parameters (singular)
		for (const userId of selectedUsers) {
			params.append('user-id', userId)
		}

		return params.toString()
	}, [selectedProjects, selectedUsers, dateRange])

	// Fetch worklog entries using TanStack Query
	const { data: worklogData, isLoading: isLoadingWorklogs } = useQuery<WorklogEntriesResponse>({
		queryKey: ['worklog-entries', queryParams],
		queryFn: async ({ signal }) => {
			const response = await fetch(`/worklog/entries?${queryParams}`, {
				signal
			})
			if (!response.ok) {
				throw new Error(`Failed to fetch worklogs: ${response.statusText}`)
			}
			return response.json() as Promise<WorklogEntriesResponse>
		},
		enabled: displayCalendar && dateRange !== undefined && selectedProjects.length > 0
	})

	const handleDatesSet = (start: Date, end: Date) => {
		setDateRange({ start, end })
	}

	useEffect(() => {
		setDisplayCalendar(true)
	}, [])

	const debugData = useMemo(
		() => ({
			projects,
			projectOptions,
			selectedProjects,
			userOptions,
			selectedUsers,
			usersData,
			isLoadingUsers,
			isLoadingProjects,
			worklogData,
			isLoadingWorklogs,
			parentLoaderData: parentLoaderData
				? {
						accessibleResources: parentLoaderData.accessibleResources
					}
				: undefined
		}),
		[
			projects,
			projectOptions,
			selectedProjects,
			userOptions,
			selectedUsers,
			usersData,
			isLoadingUsers,
			isLoadingProjects,
			worklogData,
			isLoadingWorklogs,
			parentLoaderData
		]
	)

	return (
		<div className='flex h-full flex-1 flex-col'>
			<div className='flex shrink-0 items-center gap-4 border-b p-4'>
				<ProjectMultiSelect
					options={projectOptions}
					value={selectedProjects}
					onValueChange={setSelectedProjects}
					placeholder='Select projects...'
					searchPlaceholder='Search projects...'
					emptyText='No projects found.'
					className='max-w-md'
					disabled={isLoadingProjects}
				/>
				<UserMultiSelect
					options={userOptions}
					value={selectedUsers}
					onValueChange={setSelectedUsers}
					placeholder='Select users...'
					searchPlaceholder='Search users...'
					emptyText='No users found.'
					className='max-w-md'
					disabled={isLoadingUsers}
				/>
			</div>
			<div className='flex flex-1 flex-col overflow-hidden'>
				<div className='flex flex-1 overflow-hidden'>
					<Suspense fallback={<div>Loading...</div>}>
						<Calendar
							worklogs={worklogData?.worklogs}
							onDatesSet={handleDatesSet}
						/>
					</Suspense>
				</div>
				<div className='shrink-0 p-4'>
					<DebugPanel
						data={debugData}
						title='Project Selector Debug'
					/>
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
