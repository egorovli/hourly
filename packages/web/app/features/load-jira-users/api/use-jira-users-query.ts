import { useQuery } from '@tanstack/react-query'
import type { InferQueryKeyParams } from '~/shared/index.ts'
import type { loader as jiraUsersLoader } from '~/routes/jira.users.tsx'
import { jiraUsersKeys } from '../model/query-keys.ts'

export interface UseJiraUsersQueryParams {
	userId: string
	projectIds: string[]
}

/**
 * Fetch Jira users for selected projects
 * Requires at least one project to be selected
 */
export function useJiraUsersQuery({ userId, projectIds }: UseJiraUsersQueryParams) {
	return useQuery({
		queryKey: jiraUsersKeys.byUserAndProjects(userId, projectIds),

		async queryFn({ queryKey, signal }) {
			const [, { projectIds }] = queryKey as InferQueryKeyParams<typeof queryKey>
			const searchParams = new URLSearchParams([...projectIds.map(id => ['project-id', id])])

			const response = await fetch(`/jira/users?${searchParams}`, {
				method: 'GET',
				signal
			})

			if (!response.ok) {
				throw new Error('Failed to fetch Jira users')
			}

			const data = (await response.json()) as Awaited<ReturnType<typeof jiraUsersLoader>>
			return data
		},

		enabled: projectIds.length > 0
	})
}
