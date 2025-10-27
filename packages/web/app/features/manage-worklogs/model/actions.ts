import type { DateRange } from 'react-day-picker'
import type { LocalWorklogEntry } from '~/entities/index.ts'

export type Action =
	| { type: 'selectedJiraProjectIds.select'; payload: string[] }
	| { type: 'selectedJiraUserIds.select'; payload: string[] }
	| { type: 'selectedGitlabProjectIds.select'; payload: string[] }
	| { type: 'selectedGitlabContributorIds.select'; payload: string[] }
	| { type: 'dateRange.select'; payload: DateRange | undefined }
	| { type: 'calendarViewDateRange.select'; payload: DateRange | undefined }
	| { type: 'worklog.setLoaded'; payload: LocalWorklogEntry[] }
	| { type: 'worklog.create'; payload: Omit<LocalWorklogEntry, 'localId'> }
	| { type: 'worklog.update'; payload: LocalWorklogEntry }
	| { type: 'worklog.delete'; payload: string }
	| { type: 'worklog.apply' }
	| { type: 'worklog.revert' }
