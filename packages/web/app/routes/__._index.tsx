import type { Route } from './+types/__._index.ts'
import type { Route as ParentRoute } from './+types/__.ts'
import type { ProjectOption, ProjectOptionGroup } from '~/components/project-multi-select.tsx'
import type { UserOption } from '~/components/user-multi-select.tsx'
import type { MetaDescriptor } from 'react-router'
import type { WorklogAuthor } from '~/domain/entities/worklog-author.ts'
import type { WorklogEntity } from '~/domain/entities/worklog-entity.ts'
import type { WorklogProject } from '~/modules/worklogs/domain/worklog-project.ts'

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
	categorized: Map<string, WorklogProject[]>
	uncategorized: WorklogProject[]
} {
	const projectsByCategory = new Map<string, WorklogProject[]>()
	const uncategorizedProjects: WorklogProject[] = []

	for (const project of projects) {
		if (project.categoryId) {
			const categoryId = project.categoryId.id
			const categoryProjects = projectsByCategory.get(categoryId) ?? []
			categoryProjects.push(project)
			projectsByCategory.set(categoryId, categoryProjects)
		} else {
			uncategorizedProjects.push(project)
		}
	}

	// Sort inactive projects to the end within each category
	for (const [categoryId, categoryProjects] of projectsByCategory.entries()) {
		categoryProjects.sort((a, b) => {
			const aInactive = a.isActive === false ? 1 : 0
			const bInactive = b.isActive === false ? 1 : 0
			return aInactive - bInactive
		})
	}

	// Sort uncategorized projects: inactive at the end
	uncategorizedProjects.sort((a, b) => {
		const aInactive = a.isActive === false ? 1 : 0
		const bInactive = b.isActive === false ? 1 : 0
		return aInactive - bInactive
	})

	return { categorized: projectsByCategory, uncategorized: uncategorizedProjects }
}

function buildResourceOption(
	resourceProject: WorklogProject,
	childProjects: WorklogProject[]
): ProjectOptionGroup | undefined {
	if (childProjects.length === 0) {
		return undefined
	}

	const { categorized, uncategorized } = groupProjectsByCategory(childProjects)
	const children: ProjectOption[] = []

	// Extract resource ID from resource project ID (format: "resource:xxx")
	const resourceId = resourceProject.id.replace(/^resource:/, '')

	// Add category groups
	for (const [categoryId, categoryProjects] of categorized.entries()) {
		const firstProject = categoryProjects[0]
		if (!firstProject?.categoryId) {
			continue
		}

		const categoryOption: ProjectOptionGroup = {
			id: `category:${categoryId}:${resourceId}`,
			label: firstProject.categoryId.name,
			children: categoryProjects.map(project => ({
				id: `project:${project.id}:${resourceId}`,
				value: `project:${project.id}:${resourceId}`,
				label: project.name,
				key: project.key,
				avatarUrl: project.avatarUrl,
				archived: project.isActive === false
			}))
		}

		children.push(categoryOption)
	}

	// Add uncategorized projects directly under resource
	for (const project of uncategorized) {
		children.push({
			id: `project:${project.id}:${resourceId}`,
			value: `project:${project.id}:${resourceId}`,
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
		id: resourceProject.id,
		label: resourceProject.name,
		avatarUrl: resourceProject.avatarUrl,
		children
	}
}

function buildProjectHierarchy(projects: WorklogProject[]): ProjectOption[] {
	const result: ProjectOption[] = []

	// Separate resource projects (parent projects) from actual projects
	const resourceProjects = projects.filter(p => p.id.startsWith('resource:'))
	const actualProjects = projects.filter(p => !p.id.startsWith('resource:'))

	// Group actual projects by their parent project (resource)
	const projectsByResource = new Map<string, WorklogProject[]>()
	for (const project of actualProjects) {
		if (project.parentProjectId) {
			const resourceId = project.parentProjectId.id
			const resourceProjects = projectsByResource.get(resourceId) ?? []
			resourceProjects.push(project)
			projectsByResource.set(resourceId, resourceProjects)
		}
	}

	// Build hierarchy for each resource
	for (const resourceProject of resourceProjects) {
		const childProjects = projectsByResource.get(resourceProject.id) ?? []
		const resourceOption = buildResourceOption(resourceProject, childProjects)
		if (resourceOption) {
			result.push(resourceOption)
		}
	}

	return result
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

	const projectOptions = useMemo(() => buildProjectHierarchy(projects), [projects])

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
