import type { Project } from '../entities/project.ts'
import type { ProjectProvider } from '../value-objects/project-provider.ts'

export interface ProjectSearchCriteria {
	id?: string
	name?: string
	key?: string
	resourceId?: string
	provider?: ProjectProvider
	includeArchived?: boolean
	projectTypeKey?: string
	isPrivate?: boolean
	simplified?: boolean
	style?: string
}

export interface ProjectRepository {
	listAll(): Promise<Project[]>
	listByResource(resourceId: string): Promise<Project[]>
	findById(id: string): Promise<Project | null>
	findOne(criteria: ProjectSearchCriteria): Promise<Project | null>
	search(criteria: ProjectSearchCriteria): Promise<Project[]>
}
