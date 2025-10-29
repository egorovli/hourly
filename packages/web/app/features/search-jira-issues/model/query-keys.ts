export const searchJiraIssuesKeys = {
	all: () => ['jira', 'issues', 'search'] as const,
	byQuery: (userId: string, projectIds: string[], searchText: string) =>
		[...searchJiraIssuesKeys.all(), { userId, projectIds, searchText }] as const
}
