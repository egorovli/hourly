/**
 * Query key factory for Jira projects queries
 */
export const jiraProjectsKeys = {
	all: ['jira-projects'] as const,
	byUser: (userId: string) => [...jiraProjectsKeys.all, { userId }] as const
}
