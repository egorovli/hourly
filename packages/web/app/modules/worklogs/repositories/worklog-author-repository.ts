import type { WorklogAuthor } from '../domain/worklog-author.ts'

export interface FindAllWorklogAuthorsOptions {
	signal?: AbortSignal
	projectIds?: string[]
	maxResults?: number
	query?: string
}

export interface WorklogAuthorRepository {
	findAll(options?: FindAllWorklogAuthorsOptions): Promise<WorklogAuthor[]>
}
