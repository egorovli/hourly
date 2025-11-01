import type { Project } from '../../domain/entities/project.ts'

/**
 * ProjectDtoInit - Properties required to create a ProjectDto
 *
 * Encapsulates all properties needed for ProjectDto instantiation.
 */
export interface ProjectDtoInit {
	id: string
	key: string
	name: string
}

/**
 * ProjectDto - Data Transfer Object
 *
 * Represents the Project entity in API responses.
 * Simple data carrier without business logic.
 *
 * Best Practices:
 * - Simplicity: Only contains data, no behavior
 * - Transformation: Maps between domain entities and external representation
 * - Immutability: Readonly properties for data integrity
 * - Uses parameter object pattern for construction
 */
export class ProjectDto {
	readonly id: string
	readonly key: string
	readonly name: string

	constructor(init: ProjectDtoInit) {
		this.id = init.id
		this.key = init.key
		this.name = init.name
	}

	/**
	 * Creates a DTO from a domain entity.
	 *
	 * @param project - Domain Project entity
	 * @returns ProjectDto instance
	 */
	static fromDomain(project: Project): ProjectDto {
		return new ProjectDto({
			id: project.id,
			key: project.key,
			name: project.name
		})
	}

	/**
	 * Creates an array of DTOs from an array of domain entities.
	 *
	 * @param projects - Array of domain Project entities
	 * @returns Array of ProjectDto instances
	 */
	static fromDomainList(projects: Project[]): ProjectDto[] {
		return projects.map(project => ProjectDto.fromDomain(project))
	}
}
