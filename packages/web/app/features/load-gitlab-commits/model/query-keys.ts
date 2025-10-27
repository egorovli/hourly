/**
 * Query key factory for GitLab commits queries
 */
export const gitlabCommitsKeys = {
	all: ['gitlab-commits'] as const,
	byFilters: (
		projectIds: string[],
		contributorIds: string[],
		dateRange?: { from?: string; to?: string }
	) => [...gitlabCommitsKeys.all, { projectIds, contributorIds, dateRange }] as const
}
