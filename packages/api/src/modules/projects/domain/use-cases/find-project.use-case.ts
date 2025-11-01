import type { Project } from '../entities/project.ts'
import type {
	ProjectRepository,
	ProjectSearchCriteria
} from '../repositories/project-repository.ts'
import type { ProjectProvider } from '../value-objects/project-provider.ts'

import { ValidationError } from '../../../../core/errors/validation-error.ts'

export interface FindProjectInput {
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

export class FindProjectUseCase {
	constructor(private readonly projectRepository: ProjectRepository) {}

	async execute(input: FindProjectInput): Promise<Project | null> {
		if (!input) {
			throw new ValidationError('Find project input is required')
		}

		if (input.id !== undefined) {
			const trimmedId = input.id.trim()

			if (!trimmedId) {
				throw new ValidationError('Project id cannot be empty')
			}

			return this.projectRepository.findById(trimmedId)
		}

		const criteria = this.buildCriteria(input)

		if (!criteria) {
			throw new ValidationError('At least one search criteria must be provided')
		}

		return this.projectRepository.findOne(criteria)
	}

	private buildCriteria(input: FindProjectInput): ProjectSearchCriteria | undefined {
		const trimmedName = input.name?.trim()
		const trimmedKey = input.key?.trim()
		const trimmedResourceId = input.resourceId?.trim()
		const trimmedProjectTypeKey = input.projectTypeKey?.trim()
		const trimmedStyle = input.style?.trim()

		const hasCriteria =
			Boolean(trimmedName) ||
			Boolean(trimmedKey) ||
			Boolean(input.provider) ||
			Boolean(trimmedResourceId) ||
			Boolean(trimmedProjectTypeKey) ||
			Boolean(trimmedStyle) ||
			typeof input.includeArchived === 'boolean' ||
			typeof input.isPrivate === 'boolean' ||
			typeof input.simplified === 'boolean'

		if (!hasCriteria) {
			return undefined
		}

		return {
			name: trimmedName,
			key: trimmedKey,
			provider: input.provider,
			resourceId: trimmedResourceId,
			includeArchived: input.includeArchived,
			projectTypeKey: trimmedProjectTypeKey,
			isPrivate: input.isPrivate,
			simplified: input.simplified,
			style: trimmedStyle
		}
	}
}
