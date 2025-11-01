import { ValidationError } from '../../../../core/errors/validation-error.ts'

/**
 * ProjectInit - Properties required to create a Project entity
 *
 * Encapsulates all properties needed for Project instantiation.
 * This interface belongs to the domain layer.
 */
export interface ProjectInit {
	id: string
	key: string
	name: string
}

/**
 * Project - Domain Entity
 *
 * Represents a project container in the system.
 * Encapsulates business rules and invariants.
 *
 * Best Practices:
 * - Encapsulates both state and behavior
 * - Has unique identity (id)
 * - Validates invariants in constructor
 * - Immutable (readonly properties)
 * - Uses parameter object pattern for construction
 */
export class Project {
	readonly id: string
	readonly key: string
	readonly name: string

	constructor(init: ProjectInit) {
		this.id = init.id
		this.key = init.key
		this.name = init.name

		this.validate()
	}

	/**
	 * Validates business rules and invariants.
	 * Throws ValidationError if validation fails.
	 */
	private validate(): void {
		if (!this.id || this.id.trim().length === 0) {
			throw new ValidationError('Project id is required')
		}
		if (!this.key || this.key.trim().length === 0) {
			throw new ValidationError('Project key is required')
		}
		if (!this.name || this.name.trim().length === 0) {
			throw new ValidationError('Project name is required')
		}
	}

	/**
	 * Equality comparison based on identity.
	 * Two projects are equal if they have the same id.
	 */
	equals(other: Project): boolean {
		return this.id === other.id
	}
}
