import type { Resource } from '../entities/resource.ts'
import type { ResourceRepository } from '../repositories/resource-repository.ts'

export class ListResourcesUseCase {
	constructor(private readonly resourceRepository: ResourceRepository) {}

	async execute(): Promise<Resource[]> {
		return this.resourceRepository.listAll()
	}
}
