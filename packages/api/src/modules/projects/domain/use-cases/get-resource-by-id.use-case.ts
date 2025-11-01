import type { Resource } from '../entities/resource.ts'
import type { ResourceRepository } from '../repositories/resource-repository.ts'

import { inject, injectable } from 'inversify'

import { BusinessRuleError } from '../../../../core/errors/business-rule-error.ts'
import { ValidationError } from '../../../../core/errors/validation-error.ts'
import { InjectionKey } from '../../../../core/ioc/injection-key.enum.ts'

@injectable()
export class GetResourceByIdUseCase {
	constructor(
		@inject(InjectionKey.ResourceRepository)
		private readonly resourceRepository: ResourceRepository
	) {}

	async execute(id: string): Promise<Resource> {
		const normalizedId = id?.trim()

		if (!normalizedId) {
			throw new ValidationError('Resource id is required')
		}

		const resource = await this.resourceRepository.findOne({ id: normalizedId })

		if (!resource) {
			throw new BusinessRuleError(`Resource with id ${normalizedId} was not found`)
		}

		return resource
	}
}
