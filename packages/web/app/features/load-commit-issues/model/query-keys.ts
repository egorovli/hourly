/**
 * Query key factory for commit-referenced Jira issues queries
 */
export const commitIssuesKeys = {
	all: ['jira-issues-from-commits'] as const,
	byIssueKeys: (issueKeys: string[]) => [...commitIssuesKeys.all, issueKeys.join('|')] as const
}
