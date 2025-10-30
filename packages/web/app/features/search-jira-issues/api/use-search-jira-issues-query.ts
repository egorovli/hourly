import { useQuery } from '@tanstack/react-query'
import type { loader as jiraIssuesLoader } from '~/routes/jira.issues.tsx'
import { searchJiraIssuesKeys } from '../model/query-keys.ts'

export interface UseSearchJiraIssuesQueryParams {
	userId: string
	projectIds: string[]
	searchText: string
	enabled?: boolean
}

/**
 * Search Jira issues within selected projects by text query
 */
export function useSearchJiraIssuesQuery({
	userId,
	projectIds,
	searchText,
	enabled = true
}: UseSearchJiraIssuesQueryParams) {
	return useQuery({
		queryKey: searchJiraIssuesKeys.byQuery(userId, projectIds, searchText),

		async queryFn({ queryKey, signal }) {
			const queryKeyArray = queryKey as readonly unknown[]
			if (queryKeyArray.length < 4) {
				throw new Error('Invalid query key structure')
			}
			const params = queryKeyArray[3] as { projectIds: string[]; searchText: string } | undefined
			if (
				!params ||
				typeof params !== 'object' ||
				!Array.isArray(params.projectIds) ||
				typeof params.searchText !== 'string'
			) {
				throw new Error('Invalid query key parameters')
			}
			const { projectIds, searchText } = params

			const searchParams = new URLSearchParams([
				...projectIds.map((id: string) => ['project-id', id]),
				['search', searchText],
				['page', '1'],
				['size', '50']
			])

			const response = await fetch(`/jira/issues?${searchParams}`, {
				method: 'GET',
				signal
			})

			if (!response.ok) {
				throw new Error('Failed to search Jira issues')
			}

			const data = (await response.json()) as Awaited<ReturnType<typeof jiraIssuesLoader>>
			return data
		},

		enabled: enabled && projectIds.length > 0 && searchText.trim().length > 0,

		// Keep search results fresh but don't refetch too aggressively
		staleTime: 1000 * 60 // 1 minute
	})
}
