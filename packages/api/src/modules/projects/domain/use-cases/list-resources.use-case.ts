import type { Resource } from '../entities/resource.ts'
import type { ResourceRepository } from '../repositories/resource-repository.ts'

import { inject, injectable } from 'inversify'

import { InjectionKey } from '../../../../core/ioc/injection-key.enum.ts'

@injectable()
export class ListResourcesUseCase {
	constructor(
		@inject(InjectionKey.ResourceRepository)
		private readonly resourceRepository: ResourceRepository
	) {}

	async execute(): Promise<Resource[]> {
		return this.resourceRepository.listAll()
	}
}
