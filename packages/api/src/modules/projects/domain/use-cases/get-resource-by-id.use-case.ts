import type { Resource } from '../entities/resource.ts'
import type { ResourceRepository } from '../repositories/resource-repository.ts'

import { ValidationError } from '../../../../core/errors/validation-error.ts'
import { BusinessRuleError } from '../../../../core/errors/business-rule-error.ts'

export class GetResourceByIdUseCase {
	constructor(private readonly resourceRepository: ResourceRepository) {}

	async execute(id: string): Promise<Resource> {
		const normalizedId = id?.trim()

		if (!normalizedId) {
			throw new ValidationError('Resource id is required')
		}

		const resource = await this.resourceRepository.findById(normalizedId)

		if (!resource) {
			throw new BusinessRuleError(`Resource with id ${normalizedId} was not found`)
		}

		return resource
	}
}
