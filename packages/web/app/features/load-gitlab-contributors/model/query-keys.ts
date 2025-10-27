/**
 * Query key factory for GitLab contributors queries
 */
export const gitlabContributorsKeys = {
	all: ['gitlab-contributors'] as const,
	byProjectsAndDateRange: (
		userId: string | undefined,
		projectIds: string[],
		dateRange?: { from?: string; to?: string }
	) => [...gitlabContributorsKeys.all, { userId, projectIds, dateRange }] as const
}
