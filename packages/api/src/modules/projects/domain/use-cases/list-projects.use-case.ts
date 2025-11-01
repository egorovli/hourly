import type { Project } from '../entities/project.ts'
import type {
	ProjectRepository,
	ProjectSearchCriteria
} from '../repositories/project-repository.ts'
import type { ProjectProvider } from '../value-objects/project-provider.ts'

export interface ListProjectsInput {
	resourceId?: string
	provider?: ProjectProvider
	name?: string
	key?: string
	includeArchived?: boolean
	projectTypeKey?: string
	isPrivate?: boolean
	simplified?: boolean
	style?: string
}

export class ListProjectsUseCase {
	constructor(private readonly projectRepository: ProjectRepository) {}

	async execute(input: ListProjectsInput = {}): Promise<Project[]> {
		const trimmedResourceId = input.resourceId?.trim()
		const criteria = this.buildCriteria({
			...input,
			resourceId: trimmedResourceId
		})

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
		const trimmedProjectTypeKey = input.projectTypeKey?.trim()
		const trimmedStyle = input.style?.trim()

		const hasFilters =
			Boolean(trimmedName) ||
			Boolean(trimmedKey) ||
			Boolean(input.provider) ||
			Boolean(trimmedProjectTypeKey) ||
			Boolean(trimmedStyle) ||
			typeof input.includeArchived === 'boolean' ||
			typeof input.isPrivate === 'boolean' ||
			typeof input.simplified === 'boolean'

		if (!hasFilters) {
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
