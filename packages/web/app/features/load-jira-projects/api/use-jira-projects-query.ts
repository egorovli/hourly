import { useQuery } from '@tanstack/react-query'
import type { loader as jiraProjectsLoader } from '~/routes/jira.projects.tsx'
import { jiraProjectsKeys } from '../model/query-keys.ts'

export interface UseJiraProjectsQueryParams {
	userId: string
}

/**
 * Fetch Jira projects for a user
 */
export function useJiraProjectsQuery({ userId }: UseJiraProjectsQueryParams) {
	return useQuery({
		queryKey: jiraProjectsKeys.byUser(userId),

		async queryFn({ signal }) {
			const response = await fetch('/jira/projects', {
				method: 'GET',
				signal
			})

			if (!response.ok) {
				throw new Error('Failed to fetch Jira projects')
			}

			const data = (await response.json()) as Awaited<ReturnType<typeof jiraProjectsLoader>>
			return data
		}
	})
}
