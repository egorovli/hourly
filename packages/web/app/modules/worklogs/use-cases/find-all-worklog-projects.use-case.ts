import type {
	FindAllWorklogProjectsOptions,
	WorklogProjectRepository
} from '../repositories/worklog-project-repository.ts'
import type { WorklogProject } from '../domain/worklog-project.ts'

import { inject, injectable } from 'inversify'

import { InjectionKey } from '~/core/ioc/injection-key.enum.ts'

@injectable()
export class FindAllWorklogProjectsUseCase {
	constructor(
		@inject(InjectionKey.WorklogProjectRepository)
		private readonly worklogProjectRepository: WorklogProjectRepository
	) {}

	async execute(options?: FindAllWorklogProjectsOptions): Promise<WorklogProject[]> {
		return this.worklogProjectRepository.findAll(options)
	}
}
