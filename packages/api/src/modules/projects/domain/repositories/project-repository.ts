import type { Project } from '../entities/project.ts'
import type { ProjectProvider } from '../value-objects/project-provider.ts'

export interface ProjectSearchCriteria {
	id?: string
	name?: string
	key?: string
	resourceId?: string
	provider?: ProjectProvider
	includeArchived?: boolean
}

export interface ProjectRepository {
	listAll(): Promise<Project[]>
	listByResource(resourceId: string): Promise<Project[]>
	findOne(criteria: ProjectSearchCriteria): Promise<Project | undefined>
	search(criteria: ProjectSearchCriteria): Promise<Project[]>
}
