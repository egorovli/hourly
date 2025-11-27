import type { WorklogAuthorRepository } from '~/modules/worklogs/repositories/worklog-author-repository.ts'
import type { WorklogProjectRepository } from '~/modules/worklogs/repositories/worklog-project-repository.ts'
import type { WorklogEntryRepository } from '~/modules/worklogs/repositories/worklog-entry-repository.ts'

import type { InjectionKey } from './injection-key.enum.ts'

export interface BindingMap {
	[InjectionKey.WorklogAuthorRepository]: WorklogAuthorRepository
	[InjectionKey.WorklogProjectRepository]: WorklogProjectRepository
	[InjectionKey.WorklogEntryRepository]: WorklogEntryRepository
}
