import type { Resource } from '../entities/resource.ts'

export interface ResourceSearchCriteria {
	id?: string
	name?: string
}

export interface ResourceRepository {
	listAll(): Promise<Resource[]>
	findOne(criteria: ResourceSearchCriteria): Promise<Resource | undefined>
}
