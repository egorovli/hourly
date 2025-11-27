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

		const accessibleResources = await this.client.getAccessibleResources({ signal })

		const roots: WorklogProject[] = []

		for (const resource of accessibleResources) {
			const workspaceNode: WorklogProject = {
				id: `workspace:${resource.id}`,
				name: resource.name,
				avatarUrl: resource.avatarUrl,
				isActive: true,
				children: []
			}

			try {
				const projects = await this.client.getProjects(resource.id, resource.url, {
					signal
				})

				const mappedProjects: WorklogProject[] = projects.map(project => ({
					// Encode provider + workspace so IDs are unique without exposing a \"resource\" entity in the domain
					id: `atlassian:${resource.id}:${project.id}`,
					name: project.name,
					key: project.key,
					avatarUrl: project.avatarUrls?.['48x48'],
					isActive: !project.archived,
					category: project.projectCategory
						? {
								id: project.projectCategory.id,
								name: project.projectCategory.name
							}
						: undefined
				}))

				workspaceNode.children = mappedProjects
			} catch {
				workspaceNode.children = []
			}

			roots.push(workspaceNode)
		}

		return roots
	}
}
