/**
 * Simplified Jira issue for debug panel display
 */
export interface RelevantIssueDebugEntry {
	id: string
	key: string
	summary: string
	projectName: string
	status: string
	assignee: string
	updated?: string
	created?: string
}
