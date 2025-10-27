/**
 * Query key factory for Jira users queries
 */
export const jiraUsersKeys = {
	all: ['jira-users'] as const,
	byUserAndProjects: (userId: string, projectIds: string[]) =>
		[...jiraUsersKeys.all, { userId, projectIds }] as const
}
