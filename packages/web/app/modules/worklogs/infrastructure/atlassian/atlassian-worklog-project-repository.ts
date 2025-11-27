import type { AtlassianClient } from '~/lib/atlassian/index.ts'
import type { WorklogProject } from '../../domain/worklog-project.ts'

import type {
	FindAllWorklogProjectsOptions,
	WorklogProjectRepository
} from '../../repositories/worklog-project-repository.ts'

import { injectable } from 'inversify'

@injectable()
export class AtlassianWorklogProjectRepository implements WorklogProjectRepository {
	constructor(private readonly client: AtlassianClient) {}

	async findAll(options?: FindAllWorklogProjectsOptions): Promise<WorklogProject[]> {
		const signal = options?.signal ?? AbortSignal.timeout(30_000)

		// Get accessible resources
		const accessibleResources = await this.client.getAccessibleResources({ signal })

		// Create resource projects (parent projects) and fetch actual projects
		const allProjects: WorklogProject[] = []

		for (const resource of accessibleResources) {
			// Create a parent project representing the resource
			const resourceProject: WorklogProject = {
				id: `resource:${resource.id}`,
				name: resource.name,
				avatarUrl: resource.avatarUrl,
				isActive: true
			}

			try {
				const projects = await this.client.getProjects(resource.id, resource.url, {
					signal
				})

				const mappedProjects: WorklogProject[] = projects.map(project => ({
					id: project.id,
					name: project.name,
					key: project.key,
					avatarUrl: project.avatarUrls?.['48x48'],
					isActive: !project.archived,
					category: project.projectCategory
						? {
								id: project.projectCategory.id,
								name: project.projectCategory.name
							}
						: undefined,
					parentProject: resourceProject
				}))

				allProjects.push(resourceProject, ...mappedProjects)
			} catch {
				// Still add the resource project even if fetching fails
				allProjects.push(resourceProject)
			}
		}

		return allProjects
	}
}
