/**
 * Simplified GitLab commit for debug panel display
 */
export interface GitlabCommitDebugEntry {
	id: string
	shortId: string
	title: string
	authorLabel: string
	projectName: string
	createdAt?: string
	issueKeys: string[]
}
