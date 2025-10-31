import { useInfiniteQuery } from '@tanstack/react-query'
import { DateTime } from 'luxon'
import type { InferQueryKeyParams } from '~/shared/index.ts'
import { PAGE_SIZE } from '~/shared/index.ts'
import type { loader as jiraIssuesLoader } from '~/routes/jira.issues.tsx'
import { jiraIssuesKeys } from '../model/query-keys.ts'

export interface UseJiraIssuesQueryParams {
	userId: string
	projectIds: string[]
	userIds: string[]
	dateRange?: {
		from?: Date
		to?: Date
	}
}

/**
 * Fetch Jira issues touched during the date range with infinite pagination
 */
export function useJiraIssuesQuery({
	userId,
	projectIds,
	userIds,
	dateRange
}: UseJiraIssuesQueryParams) {
	const dateRangeParam = dateRange
		? {
				from: dateRange.from?.toISOString(),
				to: dateRange.to?.toISOString()
			}
		: undefined

	return useInfiniteQuery({
		queryKey: jiraIssuesKeys.byFilters(userId, projectIds, userIds, dateRangeParam),

		initialPageParam: 1,

		async queryFn({ queryKey, signal, pageParam }) {
			const [, { projectIds, userIds, dateRange }] = queryKey as InferQueryKeyParams<
				typeof queryKey
			>

			if (!dateRange?.from || !dateRange?.to) {
				throw new Error('Date range is required to fetch touched issues')
			}

			const fromDate = DateTime.fromISO(dateRange.from).toISODate()
			const toDate = DateTime.fromISO(dateRange.to).toISODate()

			if (!fromDate || !toDate) {
				throw new Error('Invalid date range format')
			}

			const searchParams = new URLSearchParams([
				...projectIds.map(id => ['project-id', id]),
				...userIds.map(id => ['user-id', id]),
				['date-from', fromDate],
				['date-to', toDate],
				['page', String(pageParam)],
				['size', String(PAGE_SIZE)]
			])

			const response = await fetch(`/jira/issues?${searchParams}`, {
				method: 'GET',
				signal
			})

			if (!response.ok) {
				throw new Error('Failed to fetch Jira issues')
			}

			const data = (await response.json()) as Awaited<ReturnType<typeof jiraIssuesLoader>>
			return data
		},

		getNextPageParam: lastPage =>
			lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.page + 1 : undefined,

		enabled:
			projectIds.length > 0 &&
			userIds.length > 0 &&
			Boolean(dateRange?.from) &&
			Boolean(dateRange?.to)
	})
}
