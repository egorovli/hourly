import type { WorklogProjectCategory } from './worklog-project-category.ts'

export interface WorklogProject {
	id: string
	name: string
	key?: string
	avatarUrl?: string
	isActive?: boolean
	category?: WorklogProjectCategory
	children?: WorklogProject[]
}
