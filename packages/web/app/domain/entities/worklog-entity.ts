import type { WorklogAuthor } from './worklog-author.ts'

export interface WorklogEntity {
	id: string
	startedAt: Date
	finishedAt: Date
	author: Pick<WorklogAuthor, 'id' | 'name'>
}
