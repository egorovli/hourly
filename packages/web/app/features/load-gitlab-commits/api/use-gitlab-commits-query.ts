import { useInfiniteQuery } from '@tanstack/react-query'
import { DateTime } from 'luxon'
import type { InferQueryKeyParams } from '~/shared/index.ts'
import { PAGE_SIZE } from '~/shared/index.ts'
import type { loader as gitlabCommitsLoader } from '~/routes/gitlab.commits.tsx'
import { gitlabCommitsKeys } from '../model/query-keys.ts'

export interface UseGitlabCommitsQueryParams {
	userId?: string
	projectIds: string[]
	contributorIds: string[]
	dateRange?: {
		from?: Date
		to?: Date
	}
}

/**
 * Fetch GitLab commits with infinite pagination
 */
export function useGitlabCommitsQuery({
	userId,
	projectIds,
	contributorIds,
	dateRange
}: UseGitlabCommitsQueryParams) {
	const dateRangeParam = dateRange
		? {
				from: dateRange.from?.toISOString(),
				to: dateRange.to?.toISOString()
			}
		: undefined

	return useInfiniteQuery({
		queryKey: gitlabCommitsKeys.byFilters(projectIds, contributorIds, dateRangeParam),

		initialPageParam: 1,

		async queryFn({ queryKey, signal, pageParam }) {
			const [, { projectIds, contributorIds, dateRange }] = queryKey as InferQueryKeyParams<
				typeof queryKey
			>

			if (!dateRange?.from || !dateRange?.to) {
				throw new Error('Date range is required to fetch GitLab commits')
			}

			if (projectIds.length === 0 || contributorIds.length === 0) {
				throw new Error('Projects and contributors are required to fetch GitLab commits')
			}

			const fromDate = DateTime.fromISO(dateRange.from).toISODate()
			const toDate = DateTime.fromISO(dateRange.to).toISODate()

			if (!fromDate || !toDate) {
				throw new Error('Invalid date range format')
			}

			const searchParams = new URLSearchParams([
				...projectIds.map(id => ['project-id', id]),
				...contributorIds.map(id => ['contributor-id', id]),
				['date-from', fromDate],
				['date-to', toDate],
				['page', String(pageParam)],
				['size', String(PAGE_SIZE)]
			])

			const response = await fetch(`/gitlab/commits?${searchParams.toString()}`, {
				method: 'GET',
				signal
			})

			if (!response.ok) {
				throw new Error('Failed to fetch GitLab commits')
			}

			const data = (await response.json()) as Awaited<ReturnType<typeof gitlabCommitsLoader>>
			return data
		},

		getNextPageParam: lastPage =>
			lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.page + 1 : undefined,

		enabled:
			Boolean(userId) &&
			projectIds.length > 0 &&
			contributorIds.length > 0 &&
			Boolean(dateRange?.from) &&
			Boolean(dateRange?.to)
	})
}
