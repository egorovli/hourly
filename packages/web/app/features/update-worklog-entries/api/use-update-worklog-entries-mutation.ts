import { useMutation, useQueryClient } from '@tanstack/react-query'

import { worklogEntriesKeys } from '~/features/load-worklog-entries/index.ts'
import type { action as updateWorklogEntriesAction } from '~/routes/jira.worklog.entries.tsx'

import type {
	UpdateWorklogsRequest,
	UpdateWorklogsResponse,
	UpdateWorklogsError
} from '../model/types.ts'

/**
 * Mutation hook for updating worklog entries
 * Invalidates worklog entries queries on success
 */
export function useUpdateWorklogEntriesMutation() {
	const queryClient = useQueryClient()

	return useMutation<UpdateWorklogsResponse, Error, UpdateWorklogsRequest>({
		mutationFn: async (request: UpdateWorklogsRequest) => {
			const response = await fetch('/jira/worklog/entries', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(request)
			})

			if (!response.ok) {
				let errorData: UpdateWorklogsError | undefined
				try {
					errorData = (await response.json()) as UpdateWorklogsError
				} catch {
					// If JSON parsing fails, use generic error
				}

				throw new Error(
					errorData?.message || errorData?.error || 'Failed to update worklog entries'
				)
			}

			const data = (await response.json()) as Awaited<ReturnType<typeof updateWorklogEntriesAction>>
			return data
		},

		onSuccess: () => {
			// Invalidate all worklog entries queries to refetch fresh data
			queryClient.invalidateQueries({
				queryKey: worklogEntriesKeys.all
			})
		}
	})
}
