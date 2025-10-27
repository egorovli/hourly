/**
 * Query key factory for Jira issues queries
 */
export const jiraIssuesKeys = {
	all: ['jira-worklog-issues'] as const,
	byFilters: (
		userId: string,
		projectIds: string[],
		userIds: string[],
		dateRange?: { from?: string; to?: string }
	) => [...jiraIssuesKeys.all, { userId, projectIds, userIds, dateRange }] as const
}
