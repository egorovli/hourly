import type { WorklogAuthor } from '../../domain/worklog-author.ts'
import type { WorklogAuthorRepository } from '../../repositories/worklog-author-repository.ts'

import { injectable } from 'inversify'

@injectable()
export class AtlassianWorklogAuthorRepository implements WorklogAuthorRepository {
	async findAll(): Promise<WorklogAuthor[]> {
		return []
	}
}
