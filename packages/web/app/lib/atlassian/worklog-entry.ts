export interface WorklogEntry {
	id: string
	issueId: string
	issueKey: string
	issueSummary: string
	issueDescription?: unknown
	authorAccountId?: string
	authorDisplayName?: string
	timeSpentSeconds: number
	started: string
	created?: string
	updated?: string
	comment?: unknown
}

export interface WorklogEntryPage {
	entries: WorklogEntry[]
	total: number
	startAt: number
	maxResults: number
}
