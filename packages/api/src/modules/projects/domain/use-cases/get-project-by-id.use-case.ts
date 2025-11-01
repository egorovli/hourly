import type { Project } from '../entities/project.ts'
import type { ProjectRepository } from '../repositories/project-repository.ts'

import { inject, injectable } from 'inversify'

import { BusinessRuleError } from '../../../../core/errors/business-rule-error.ts'
import { ValidationError } from '../../../../core/errors/validation-error.ts'
import { InjectionKey } from '../../../../core/ioc/injection-key.enum.ts'

@injectable()
export class GetProjectByIdUseCase {
	constructor(
		@inject(InjectionKey.ProjectRepository)
		private readonly projectRepository: ProjectRepository
	) {}

	async execute(id: string): Promise<Project> {
		const normalizedId = id?.trim()

		if (!normalizedId) {
			throw new ValidationError('Project id is required')
		}

		const project = await this.projectRepository.findOne({ id: normalizedId })

		if (!project) {
			throw new BusinessRuleError(`Project with id ${normalizedId} was not found`)
		}

		return project
	}
}
