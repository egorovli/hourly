/**
 * Query key factory for worklog entries queries
 */
export const worklogEntriesKeys = {
	all: ['jira-worklog-entries'] as const,
	byFilters: (
		userId: string,
		projectIds: string[],
		userIds: string[],
		dateRange?: { from?: string; to?: string }
	) => [...worklogEntriesKeys.all, { userId, projectIds, userIds, dateRange }] as const
}
