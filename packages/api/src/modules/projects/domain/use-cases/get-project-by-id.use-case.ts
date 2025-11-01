import type { Project } from '../entities/project.ts'
import type { ProjectRepository } from '../repositories/project-repository.ts'

import { ValidationError } from '../../../../core/errors/validation-error.ts'
import { BusinessRuleError } from '../../../../core/errors/business-rule-error.ts'

export class GetProjectByIdUseCase {
	constructor(private readonly projectRepository: ProjectRepository) {}

	async execute(id: string): Promise<Project> {
		const normalizedId = id?.trim()

		if (!normalizedId) {
			throw new ValidationError('Project id is required')
		}

		const project = await this.projectRepository.findById(normalizedId)

		if (!project) {
			throw new BusinessRuleError(`Project with id ${normalizedId} was not found`)
		}

		return project
	}
}
