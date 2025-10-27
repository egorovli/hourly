import { useInfiniteQuery } from '@tanstack/react-query'
import { chunkArray, PAGE_SIZE } from '~/shared/index.ts'
import type { loader as jiraIssuesLoader } from '~/routes/jira.issues.tsx'
import { commitIssuesKeys } from '../model/query-keys.ts'

export interface UseCommitIssuesQueryParams {
	issueKeys: string[]
}

/**
 * Fetch Jira issues referenced in GitLab commits with infinite pagination
 */
export function useCommitIssuesQuery({ issueKeys }: UseCommitIssuesQueryParams) {
	const issueKeyChunks = issueKeys.length > 0 ? chunkArray(issueKeys, PAGE_SIZE) : []

	return useInfiniteQuery({
		queryKey: commitIssuesKeys.byIssueKeys(issueKeys),

		initialPageParam: 0,

		async queryFn({ pageParam, signal }) {
			const chunk = issueKeyChunks[pageParam] ?? []
			if (chunk.length === 0) {
				return {
					issues: [],
					summary: {
						totalIssuesMatched: 0,
						truncated: false
					},
					pageInfo: {
						page: pageParam + 1,
						size: PAGE_SIZE,
						total: issueKeys.length,
						totalPages: Math.ceil(issueKeys.length / PAGE_SIZE),
						hasNextPage: pageParam + 1 < issueKeyChunks.length
					}
				}
			}

			const searchParams = new URLSearchParams(chunk.map(key => ['issue-key', key]))
			searchParams.set('page', '1')
			searchParams.set('size', String(chunk.length))

			const response = await fetch(`/jira/issues?${searchParams.toString()}`, {
				method: 'GET',
				signal
			})

			if (!response.ok) {
				throw new Error('Failed to fetch Jira issues referenced in commits')
			}

			const data = (await response.json()) as Awaited<ReturnType<typeof jiraIssuesLoader>>
			return {
				...data,
				pageInfo: {
					page: pageParam + 1,
					size: chunk.length,
					total: issueKeys.length,
					totalPages: Math.ceil(issueKeys.length / PAGE_SIZE),
					hasNextPage: pageParam + 1 < issueKeyChunks.length
				}
			}
		},

		getNextPageParam: (_lastPage, _pages, lastPageParam) => {
			const next = lastPageParam + 1
			return next < issueKeyChunks.length ? next : undefined
		},

		enabled: issueKeyChunks.length > 0
	})
}
