import type { WorklogAuthor } from '../domain/worklog-author.ts'

// biome-ignore lint/suspicious/noEmptyInterface: Empty interface for now
export interface FindAllWorklogAuthorsOptions {}

export interface WorklogAuthorRepository {
	findAll(options?: FindAllWorklogAuthorsOptions): Promise<WorklogAuthor[]>
}
