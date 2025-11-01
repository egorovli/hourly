export interface WorklogEntryInit {
	id: string
	issueKey: string
	issueId: string
	summary: string
	projectId: string
	authorAccountId: string
	started: string
	timeSpentSeconds: number
}

export class WorklogEntry {
	readonly id: string
	readonly issueKey: string
	readonly issueId: string
	readonly summary: string
	readonly projectId: string
	readonly authorAccountId: string
	readonly started: string
	readonly timeSpentSeconds: number

	/**
	 * Creates a WorklogEntry instance
	 *
	 * Note: Validation should be performed before calling this constructor.
	 * Use WorklogEntryFactory for creating instances with validation.
	 *
	 * @param init - Validated WorklogEntryInit data
	 */
	constructor(init: WorklogEntryInit) {
		this.id = init.id
		this.issueKey = init.issueKey
		this.issueId = init.issueId
		this.summary = init.summary
		this.projectId = init.projectId
		this.authorAccountId = init.authorAccountId
		this.started = init.started
		this.timeSpentSeconds = init.timeSpentSeconds
	}
}
