import { useQuery } from '@tanstack/react-query'
import type { loader as gitlabProjectsLoader } from '~/routes/gitlab.projects.tsx'
import { gitlabProjectsKeys } from '../model/query-keys.ts'

export interface UseGitlabProjectsQueryParams {
	userId?: string
}

/**
 * Fetch GitLab projects for a user
 */
export function useGitlabProjectsQuery({ userId }: UseGitlabProjectsQueryParams) {
	return useQuery({
		queryKey: gitlabProjectsKeys.byUser(userId),

		async queryFn({ signal }) {
			const response = await fetch('/gitlab/projects', {
				method: 'GET',
				signal
			})

			if (!response.ok) {
				throw new Error('Failed to fetch GitLab projects')
			}

			const data = (await response.json()) as Awaited<ReturnType<typeof gitlabProjectsLoader>>
			return data
		},

		enabled: Boolean(userId)
	})
}
