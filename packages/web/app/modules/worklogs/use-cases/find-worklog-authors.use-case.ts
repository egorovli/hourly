import type { WorklogAuthor } from '../domain/worklog-author.ts'
import type {
	FindAllWorklogAuthorsOptions,
	WorklogAuthorRepository
} from '../repositories/worklog-author-repository.ts'

import { inject, injectable } from 'inversify'

import { InjectionKey } from '~/core/ioc/injection-key.enum.ts'

@injectable()
export class FindWorklogAuthorsUseCase {
	constructor(
		@inject(InjectionKey.WorklogAuthorRepository)
		private readonly worklogAuthorRepository: WorklogAuthorRepository
	) {}

	async execute(options?: FindAllWorklogAuthorsOptions): Promise<WorklogAuthor[]> {
		return this.worklogAuthorRepository.findAll(options)
	}
}
