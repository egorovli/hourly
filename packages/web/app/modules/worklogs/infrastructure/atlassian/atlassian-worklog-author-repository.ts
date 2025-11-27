import type { WorklogAuthor } from '../../domain/worklog-author.ts'
import type {
	FindAllWorklogAuthorsOptions,
	WorklogAuthorRepository
} from '../../repositories/worklog-author-repository.ts'

import type { AtlassianClient } from '~/lib/atlassian/index.ts'

import { injectable } from 'inversify'

import { mapJiraUserToWorklogAuthor } from '~/lib/atlassian/index.ts'

@injectable()
export class AtlassianWorklogAuthorRepository implements WorklogAuthorRepository {
	constructor(private readonly client: AtlassianClient) {}

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Aggregates provider paging, dedupe, and optional filtering
	async findAll(options?: FindAllWorklogAuthorsOptions): Promise<WorklogAuthor[]> {
		const signal = options?.signal ?? AbortSignal.timeout(30_000)
		const projectIds = options?.projectIds ?? []

		if (projectIds.length === 0) {
			return []
		}

		const workspaceProjects = new Map<string, Set<string>>()

		const parseProjectSelection = (value: string) => {
			const match = value.match(/^project:atlassian:([^:]+):(.+)$/)
			if (!match) {
				return null
			}
			const [, workspaceId, projectId] = match
			if (!workspaceId || !projectId) {
				return null
			}
			return { workspaceId, projectId }
		}

		for (const raw of projectIds) {
			const parsed = parseProjectSelection(raw)
			if (!parsed) {
				continue
			}
			const set = workspaceProjects.get(parsed.workspaceId) ?? new Set<string>()
			set.add(parsed.projectId)
			workspaceProjects.set(parsed.workspaceId, set)
		}

		if (workspaceProjects.size === 0) {
			return []
		}

		const accessibleResources = await this.client.getAccessibleResources({ signal })

		const projectKeysByWorkspace = new Map<string, string[]>()

		for (const resource of accessibleResources) {
			const requestedProjects = workspaceProjects.get(resource.id)
			if (!requestedProjects || requestedProjects.size === 0) {
				continue
			}

			try {
				const projects = await this.client.getProjects(resource.id, resource.url, { signal })
				const keys = projects
					.filter(project => requestedProjects.has(project.id))
					.map(project => project.key)
					.filter((key): key is string => Boolean(key))

				if (keys.length > 0) {
					projectKeysByWorkspace.set(resource.id, keys)
				}
			} catch {
				// Ignore workspaces that fail to load projects
			}
		}

		if (projectKeysByWorkspace.size === 0) {
			return []
		}

		const authorMap = new Map<string, WorklogAuthor>()

		for (const [workspaceId, projectKeys] of projectKeysByWorkspace.entries()) {
			try {
				const users = await this.client.getUsersByProjects(workspaceId, projectKeys, {
					signal,
					maxResults: options?.maxResults
				})

				for (const user of users) {
					if (authorMap.has(user.accountId)) {
						continue
					}
					authorMap.set(user.accountId, mapJiraUserToWorklogAuthor(user))
				}
			} catch {
				// Ignore workspaces that fail to load users
			}
		}

		let authors = Array.from(authorMap.values())

		if (options?.query) {
			const needle = options.query.toLowerCase()
			authors = authors.filter(author => {
				return (
					author.name.toLowerCase().includes(needle) ||
					(author.email?.toLowerCase().includes(needle) ?? false)
				)
			})
		}

		return authors
	}
}
