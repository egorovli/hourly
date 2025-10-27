/**
 * Query key factory for GitLab projects queries
 */
export const gitlabProjectsKeys = {
	all: ['gitlab-projects'] as const,
	byUser: (userId?: string) => [...gitlabProjectsKeys.all, { userId }] as const
}
