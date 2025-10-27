/**
 * Core worklog entry with local state management
 */
export interface LocalWorklogEntry {
	localId: string
	id?: string
	issueKey: string
	summary: string
	projectName: string
	authorName: string
	started: string
	timeSpentSeconds: number
	isNew?: boolean
}

/**
 * Simplified worklog entry for debug panel display
 */
export interface WorklogDebugEntry {
	id: string
	issueKey: string
	summary: string
	projectName: string
	authorName: string
	started?: string
	timeSpentSeconds: number
}

/**
 * Summary of changes between loaded and local worklog entries
 */
export interface WorklogChanges {
	newEntries: LocalWorklogEntry[]
	modifiedEntries: LocalWorklogEntry[]
	deletedEntries: LocalWorklogEntry[]
	hasChanges: boolean
	changeCount: number
}
