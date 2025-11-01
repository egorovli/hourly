import type { ListProjectsCommand } from '../commands/list-projects-command.ts'
import type { Project } from '../../domain/entities/project.ts'
import type { ProjectRepository } from '../../domain/repositories/project-repository.ts'

import { injectable, inject } from 'inversify'

import { InjectionKey } from '../../../../core/ioc/injection-key.enum.ts'

/**
 * ListProjectsUseCase - Application Use Case
 *
 * Orchestrates the listing of projects.
 * This use case coordinates domain operations without containing business logic.
 *
 * Best Practices:
 * - Orchestration: Coordinates domain operations
 * - Single Responsibility: Only handles listing projects
 * - Dependency Injection: Receives repository via interface
 * - Input Validation: Validates command before processing
 */
@injectable()
export class ListProjectsUseCase {
	constructor(
		@inject(InjectionKey.ProjectRepository)
		private readonly projectRepository: ProjectRepository
	) {}

	/**
	 * Executes the list projects use case.
	 *
	 * @param command - Command containing optional resource ID filter
	 * @returns Promise resolving to array of Project entities
	 */
	async execute(command: ListProjectsCommand = {}): Promise<Project[]> {
		if (command.resourceId) {
			return this.projectRepository.listByResource(command.resourceId)
		}

		return this.projectRepository.listAll()
	}
}
