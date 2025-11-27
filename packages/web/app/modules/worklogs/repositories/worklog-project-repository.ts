import type { WorklogProject } from '../domain/worklog-project.ts'

export interface FindAllWorklogProjectsOptions {
	signal?: AbortSignal
}

export interface WorklogProjectRepository {
	findAll(options?: FindAllWorklogProjectsOptions): Promise<WorklogProject[]>
}
