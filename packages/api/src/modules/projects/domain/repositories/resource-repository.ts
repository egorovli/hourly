import type { Resource } from '../entities/resource.ts'

export interface ResourceRepository {
	listAll(): Promise<Resource[]>
	findById(id: string): Promise<Resource | null>
	findByName(name: string): Promise<Resource | null>
}
