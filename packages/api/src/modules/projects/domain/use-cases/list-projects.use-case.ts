import type { Project } from '../entities/project.ts'
import type {
	ProjectRepository,
	ProjectSearchCriteria
} from '../repositories/project-repository.ts'
import type { ProjectProvider } from '../value-objects/project-provider.ts'

import { inject, injectable } from 'inversify'

import { InjectionKey } from '../../../../core/ioc/injection-key.enum.ts'

export interface ListProjectsInput {
	resourceId?: string
	provider?: ProjectProvider
	name?: string
	key?: string
	includeArchived?: boolean
}

@injectable()
export class ListProjectsUseCase {
	constructor(
		@inject(InjectionKey.ProjectRepository)
		private readonly projectRepository: ProjectRepository
	) {}

	async execute(input: ListProjectsInput = {}): Promise<Project[]> {
		const trimmedResourceId = input.resourceId?.trim()
		const criteria = this.buildCriteria(input)

		if (criteria) {
			return this.projectRepository.search(criteria)
		}

		if (trimmedResourceId) {
			return this.projectRepository.listByResource(trimmedResourceId)
		}

		return this.projectRepository.listAll()
	}

	private buildCriteria(input: ListProjectsInput): ProjectSearchCriteria | undefined {
		const trimmedName = input.name?.trim()
		const trimmedKey = input.key?.trim()
		const trimmedResourceId = input.resourceId?.trim()

		const hasFilters =
			Boolean(trimmedName) ||
			Boolean(trimmedKey) ||
			Boolean(input.provider) ||
			Boolean(trimmedResourceId) ||
			typeof input.includeArchived === 'boolean'

		if (!hasFilters) {
			return undefined
		}

		return {
			name: trimmedName,
			key: trimmedKey,
			provider: input.provider,
			resourceId: trimmedResourceId,
			includeArchived: input.includeArchived
		}
	}
}
