import { useQuery } from '@tanstack/react-query'
import { DateTime } from 'luxon'
import type { InferQueryKeyParams } from '~/shared/index.ts'
import type { loader as gitlabContributorsLoader } from '~/routes/gitlab.contributors.tsx'
import { gitlabContributorsKeys } from '../model/query-keys.ts'

export interface UseGitlabContributorsQueryParams {
	userId?: string
	projectIds: string[]
	dateRange?: {
		from?: Date
		to?: Date
	}
}

/**
 * Fetch GitLab contributors for selected projects and date range
 */
export function useGitlabContributorsQuery({
	userId,
	projectIds,
	dateRange
}: UseGitlabContributorsQueryParams) {
	const dateRangeParam = dateRange
		? {
				from: dateRange.from?.toISOString(),
				to: dateRange.to?.toISOString()
			}
		: undefined

	return useQuery({
		queryKey: gitlabContributorsKeys.byProjectsAndDateRange(userId, projectIds, dateRangeParam),

		async queryFn({ queryKey, signal }) {
			const [, { projectIds, dateRange }] = queryKey as InferQueryKeyParams<typeof queryKey>

			if (!dateRange?.from || !dateRange?.to) {
				throw new Error('Date range is required to fetch GitLab contributors')
			}

			const fromDate = DateTime.fromISO(dateRange.from).toISODate()
			const toDate = DateTime.fromISO(dateRange.to).toISODate()

			if (!fromDate || !toDate) {
				throw new Error('Invalid date range format')
			}

			const searchParams = new URLSearchParams([
				...projectIds.map(id => ['project-id', id]),
				['date-from', fromDate],
				['date-to', toDate]
			])

			const response = await fetch(`/gitlab/contributors?${searchParams}`, {
				method: 'GET',
				signal
			})

			if (!response.ok) {
				throw new Error('Failed to fetch GitLab contributors')
			}

			const data = (await response.json()) as Awaited<ReturnType<typeof gitlabContributorsLoader>>
			return data
		},

		enabled:
			Boolean(userId) && projectIds.length > 0 && Boolean(dateRange?.from) && Boolean(dateRange?.to)
	})
}
