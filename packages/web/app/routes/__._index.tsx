import type { Route } from './+types/__._index.ts'
import type { Route as ParentRoute } from './+types/__.ts'
import type { JiraProject } from '~/lib/atlassian/client.ts'
import type { ProjectOption, ProjectOptionGroup } from '~/components/project-multi-select.tsx'

import { useEffect, useState, lazy, Suspense, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouteLoaderData } from 'react-router'

import { DebugPanel } from '~/components/debug-panel.tsx'
import { ProjectMultiSelect } from '~/components/project-multi-select.tsx'
import type { JiraWorklog } from '~/lib/atlassian/client.ts'

const Calendar = lazy(() =>
	import('~/components/calendar/index.tsx').then(m => ({ default: m.Calendar }))
)

interface ProjectsByResource {
	resourceId: string
	resourceName: string
	resourceAvatarUrl?: string
	projects: JiraProject[]
	error?: {
		message?: string
		status?: number
		url?: string
	}
}

function getProjectAvatarUrl(project: JiraProject): string | undefined {
	return (
		project.avatarUrls?.['48x48'] ?? project.avatarUrls?.['32x32'] ?? project.avatarUrls?.['24x24']
	)
}

function groupProjectsByCategory(projects: JiraProject[]): {
	categorized: Map<string, JiraProject[]>
	uncategorized: JiraProject[]
} {
	const projectsByCategory = new Map<string, JiraProject[]>()
	const uncategorizedProjects: JiraProject[] = []

	for (const project of projects) {
		if (project.projectCategory) {
			const categoryId = project.projectCategory.id
			const categoryProjects = projectsByCategory.get(categoryId) ?? []
			categoryProjects.push(project)
			projectsByCategory.set(categoryId, categoryProjects)
		} else {
			uncategorizedProjects.push(project)
		}
	}

	// Sort archived projects to the end within each category
	for (const [categoryId, categoryProjects] of projectsByCategory.entries()) {
		categoryProjects.sort((a, b) => {
			const aArchived = a.archived === true ? 1 : 0
			const bArchived = b.archived === true ? 1 : 0
			return aArchived - bArchived
		})
	}

	// Sort uncategorized projects: archived at the end
	uncategorizedProjects.sort((a, b) => {
		const aArchived = a.archived === true ? 1 : 0
		const bArchived = b.archived === true ? 1 : 0
		return aArchived - bArchived
	})

	return { categorized: projectsByCategory, uncategorized: uncategorizedProjects }
}

function buildResourceOption(
	resourceId: string,
	resourceName: string,
	resourceAvatarUrl: string | undefined,
	projects: JiraProject[]
): ProjectOptionGroup | undefined {
	if (projects.length === 0) {
		return undefined
	}

	const { categorized, uncategorized } = groupProjectsByCategory(projects)
	const children: ProjectOption[] = []

	// Add category groups
	for (const [categoryId, categoryProjects] of categorized.entries()) {
		const firstProject = categoryProjects[0]
		if (!firstProject?.projectCategory) {
			continue
		}

		const categoryOption: ProjectOptionGroup = {
			id: `category:${categoryId}:${resourceId}`,
			label: firstProject.projectCategory.name,
			children: categoryProjects.map(project => ({
				id: `project:${project.id}:${resourceId}`,
				value: `project:${project.id}:${resourceId}`,
				label: project.name,
				key: project.key,
				avatarUrl: getProjectAvatarUrl(project),
				archived: project.archived
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
			avatarUrl: getProjectAvatarUrl(project),
			archived: project.archived
		})
	}

	if (children.length === 0) {
		return undefined
	}

	return {
		id: `resource:${resourceId}`,
		label: resourceName,
		avatarUrl: resourceAvatarUrl,
		children
	}
}

function buildProjectHierarchy(projectsByResource: ProjectsByResource[]): ProjectOption[] {
	const result: ProjectOption[] = []

	for (const { resourceId, resourceName, resourceAvatarUrl, projects } of projectsByResource) {
		const resourceOption = buildResourceOption(
			resourceId,
			resourceName,
			resourceAvatarUrl,
			projects
		)
		if (resourceOption) {
			result.push(resourceOption)
		}
	}

	return result
}

interface WorklogEntriesResponse {
	worklogs: JiraWorklog[]
	total: number
	pageSize: number
	hasMore: boolean
}

export default function CalendarPage({ loaderData }: Route.ComponentProps) {
	const [displayCalendar, setDisplayCalendar] = useState(false)
	const [selectedProjects, setSelectedProjects] = useState<string[]>([])
	const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | undefined>(undefined)

	const parentLoaderData = useRouteLoaderData<ParentRoute.ComponentProps['loaderData']>('routes/__')
	const projectsByResource = parentLoaderData?.projectsByResource ?? []

	const projectOptions = useMemo(
		() => buildProjectHierarchy(projectsByResource),
		[projectsByResource]
	)

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

		return params.toString()
	}, [selectedProjects, dateRange])

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
			projectsByResource,
			projectOptions,
			selectedProjects,
			worklogData,
			isLoadingWorklogs,
			parentLoaderData: parentLoaderData
				? {
						accessibleResources: parentLoaderData.accessibleResources,
						projectsByResource: parentLoaderData.projectsByResource
					}
				: undefined
		}),
		[
			projectsByResource,
			projectOptions,
			selectedProjects,
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
					placeholder='Select projects to operate on...'
					searchPlaceholder='Search projects...'
					emptyText='No projects found.'
					className='max-w-md'
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
