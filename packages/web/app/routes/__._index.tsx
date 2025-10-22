import type { Route } from './+types/__._index.ts'

import { useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod/v4'
import { Check, X } from 'lucide-react'
import { Suspense, use, useState } from 'react'
import { Form, useNavigation } from 'react-router'
import { z } from 'zod'

import { Filter, type FilterGroup } from '~/components/data-table-faceted-filter.tsx'
import { Button } from '~/components/shadcn/ui/button.tsx'
import { Skeleton } from '~/components/shadcn/ui/skeleton.tsx'
import { Spinner } from '~/components/shadcn/ui/spinner.tsx'

import { AtlassianClient, type JiraProject } from '~/lib/atlassian/index.ts'
import { orm, Token } from '~/lib/mikro-orm/index.ts'
import { getSession } from '~/lib/session/storage.ts'

/**
 * Schema for validating project selection
 */
const projectSelectionSchema = z.object({
	'jira-project-id': z
		.array(z.string())
		.min(1, 'Please select at least one project')
		.optional()
		.default([])
})

/**
 * Loader function - fetches available Jira projects and validates selected ones
 */
export async function loader({ request }: Route.LoaderArgs) {
	// Get session and validate user (critical data - await immediately)
	const session = await getSession(request.headers.get('Cookie'))
	const user = session.get('user')

	if (!user?.atlassian?.id) {
		throw new Error('Atlassian profile ID not found. Please sign in.')
	}

	// Get token (critical data - await immediately)
	const em = orm.em.fork()
	const token = await em.findOne(Token, {
		profileId: user.atlassian.id,
		provider: 'atlassian'
	})

	if (!token?.accessToken) {
		throw new Error('Atlassian access token not found. Please reconnect your account.')
	}

	const client = new AtlassianClient({
		accessToken: token.accessToken,
		refreshToken: token.refreshToken
	})

	// Parse query parameters early (critical for validation)
	const url = new URL(request.url)

	// Return promise for non-critical data (resources and projects)
	// This allows the page to render immediately with a loading state
	const projects = (async () => {
		// Fetch all accessible resources and their projects
		const resources = await client.getAccessibleResources()
		const projectsByResource: Record<string, JiraProject[]> = {}

		for (const resource of resources) {
			const { projects } = await client.listJiraProjects(resource.id, { maxResults: 100 })
			projectsByResource[resource.id] = projects
		}

		// Validate query parameters with fetched data
		const schema = projectSelectionSchema.refine(
			data => {
				// Validate that all selected project IDs exist
				const allProjectIds = new Set(
					Object.values(projectsByResource)
						.flat()
						.map(p => p.id)
				)
				return data['jira-project-id'].every(id => allProjectIds.has(id))
			},
			{
				message: 'One or more selected projects are not available',
				path: ['jira-project-id']
			}
		)

		const submission = parseWithZod(url.searchParams, { schema })

		const selectedProjectIds =
			submission.status === 'success' ? submission.value['jira-project-id'] : []

		const hasSelection = selectedProjectIds.length > 0

		return {
			lastResult: submission.reply(),
			resources,
			projectsByResource,
			selectedProjectIds,
			hasSelection
		}
	})()

	// Return object with promise (not awaited)
	return {
		projects: projects
	}
}

/**
 * Component that uses React.use() to unwrap the projects promise
 * This must be a separate component to trigger Suspense boundary
 */
function ProjectsContent({
	promise: projectsPromise
}: {
	promise: Awaited<ReturnType<typeof loader>>['projects']
}) {
	// Use React.use() to unwrap the promise
	const { lastResult, resources, projectsByResource, selectedProjectIds } = use(projectsPromise)

	const navigation = useNavigation()
	const isNavigating = navigation.state === 'loading'

	// Initialize Conform form with validation
	const [form] = useForm({
		lastResult,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: projectSelectionSchema })
		},
		shouldValidate: 'onSubmit',
		shouldRevalidate: 'onInput'
	})

	// Local state for managing filter selection before applying
	const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(new Set(selectedProjectIds))

	// Build filter groups from resources and projects
	const filterGroups: FilterGroup[] = resources.map(resource => ({
		label: resource.name,
		options: (projectsByResource[resource.id] || []).map(project => ({
			label: project.name,
			value: project.id
		}))
	}))

	// Check if local state differs from URL state
	const hasLocalChanges =
		localSelectedIds.size !== selectedProjectIds.length ||
		![...localSelectedIds].every(id => selectedProjectIds.includes(id))

	return (
		<Form
			method='get'
			id={form.id}
			onSubmit={form.onSubmit}
			className='contents'
		>
			{/* Faceted filter for project selection */}
			<Filter
				title='Projects'
				groups={filterGroups}
				options={[]}
				selectedValues={localSelectedIds}
				onSelect={setLocalSelectedIds}
			/>

			{/* Hidden inputs for form submission */}
			{[...localSelectedIds].map(projectId => (
				<input
					key={projectId}
					type='hidden'
					name='jira-project-id'
					value={projectId}
				/>
			))}

			{/* Status indicator and actions */}
			{hasLocalChanges && (
				<div className='flex items-start justify-start gap-1'>
					<Button
						type='submit'
						size='icon-sm'
						variant='default'
						disabled={isNavigating}
					>
						{isNavigating ? <Spinner /> : <Check />}
					</Button>
					<Button
						type='button'
						size='icon-sm'
						variant='ghost'
						disabled={localSelectedIds.size === 0}
						onClick={() => {
							setLocalSelectedIds(new Set())
						}}
					>
						<X />
					</Button>
				</div>
			)}
		</Form>
	)
}

/**
 * Main component with Suspense boundary
 */
export default function WorklogsPage({ loaderData }: Route.ComponentProps) {
	return (
		<div className='bg-background'>
			<div className='flex flex-col gap-6'>
				<div className='space-y-3'>
					<div>
						<h1 className='text-3xl font-bold //tracking-tight'>Worklogs</h1>
						<p className='mt-1 text-sm text-muted-foreground'>
							Select Jira projects to view and manage worklogs
						</p>
					</div>

					<div className='flex items-center gap-3 py-2 pb-4 border-b'>
						<Suspense fallback={<Skeleton className='h-8 w-48' />}>
							<ProjectsContent promise={loaderData.projects} />
						</Suspense>
					</div>
				</div>
			</div>
		</div>
	)
}
