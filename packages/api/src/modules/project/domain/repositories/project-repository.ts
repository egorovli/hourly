import type { Project } from '../entities/project.ts'

/**
 * ProjectRepository - Repository Interface
 *
 * Defines the contract for data access operations on Project entities.
 * This interface belongs to the domain layer and is implemented in the infrastructure layer.
 *
 * Best Practices:
 * - Abstraction: Decouples domain logic from data access implementation
 * - Interface Segregation: Only exposes necessary methods
 * - Domain Language: Uses domain entities, not DTOs or provider models
 */
export interface ProjectRepository {
	/**
	 * List all projects accessible to the user across all resources.
	 *
	 * @returns Promise resolving to array of Project entities
	 */
	listAll(): Promise<Project[]>

	/**
	 * List projects for a specific resource/cloud ID.
	 *
	 * @param resourceId - The resource/cloud identifier
	 * @returns Promise resolving to array of Project entities
	 */
	listByResource(resourceId: string): Promise<Project[]>

	/**
	 * Find a project by its unique identifier.
	 *
	 * @param id - The project identifier
	 * @returns Promise resolving to Project entity or null if not found
	 */
	findById(id: string): Promise<Project | null>
}
