import type { DateRange } from 'react-day-picker'
import type { LocalWorklogEntry } from '~/entities/index.ts'

export interface State {
	selectedJiraProjectIds: string[]
	selectedJiraUserIds: string[]
	selectedGitlabProjectIds: string[]
	selectedGitlabContributorIds: string[]
	dateRange?: DateRange
	calendarViewDateRange?: DateRange
	loadedWorklogEntries: Map<string, LocalWorklogEntry>
	localWorklogEntries: Map<string, LocalWorklogEntry>
}

export const initialState: State = {
	selectedJiraProjectIds: [],
	selectedJiraUserIds: [],
	selectedGitlabProjectIds: [],
	selectedGitlabContributorIds: [],
	loadedWorklogEntries: new Map(),
	localWorklogEntries: new Map()
}
