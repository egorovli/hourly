import { useInfiniteQuery } from '@tanstack/react-query'
import { DateTime } from 'luxon'
import type { InferQueryKeyParams } from '~/shared/index.ts'
import { PAGE_SIZE } from '~/shared/index.ts'
import type { loader as jiraWorklogEntriesLoader } from '~/routes/jira.worklog.entries.tsx'
import { worklogEntriesKeys } from '../model/query-keys.ts'

export interface UseWorklogEntriesQueryParams {
	userId: string
	projectIds: string[]
	userIds: string[]
	dateRange?: {
		from?: Date
		to?: Date
	}
}

/**
 * Fetch worklog entries with infinite pagination
 * Requires projects, users, and date range to be selected
 */
export function useWorklogEntriesQuery({
	userId,
	projectIds,
	userIds,
	dateRange
}: UseWorklogEntriesQueryParams) {
	const dateRangeParam = dateRange
		? {
				from: dateRange.from?.toISOString(),
				to: dateRange.to?.toISOString()
			}
		: undefined

	return useInfiniteQuery({
		queryKey: worklogEntriesKeys.byFilters(userId, projectIds, userIds, dateRangeParam),

		initialPageParam: 1,

		async queryFn({ queryKey, signal, pageParam }) {
			const [, { projectIds, userIds, dateRange }] = queryKey as InferQueryKeyParams<
				typeof queryKey
			>

			if (!dateRange?.from || !dateRange?.to) {
				throw new Error('Date range is required to fetch worklog entries')
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

			const response = await fetch(`/jira/worklog/entries?${searchParams}`, {
				method: 'GET',
				signal
			})

			if (!response.ok) {
				throw new Error('Failed to fetch Jira worklog entries')
			}

			const data = (await response.json()) as Awaited<ReturnType<typeof jiraWorklogEntriesLoader>>
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
