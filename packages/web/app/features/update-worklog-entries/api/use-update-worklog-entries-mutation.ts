import { useMutation, useQueryClient } from '@tanstack/react-query'

import { worklogEntriesKeys } from '~/features/load-worklog-entries/index.ts'
import type { action as updateWorklogEntriesAction } from '~/routes/jira.worklog.entries.tsx'

import type {
	WorklogChangesRequest,
	WorklogChangesResponse,
	WorklogChangesError
} from '../model/types.ts'

/**
 * Mutation hook for saving worklog changes to Jira
 * Invalidates worklog entries queries on success
 */
export function useUpdateWorklogEntriesMutation() {
	const queryClient = useQueryClient()

	return useMutation<WorklogChangesResponse, Error, WorklogChangesRequest>({
		mutationFn: async (request: WorklogChangesRequest) => {
			const response = await fetch('/jira/worklog/entries', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(request)
			})

			if (!response.ok) {
				let errorData: WorklogChangesError | undefined
				try {
					errorData = (await response.json()) as WorklogChangesError
				} catch {
					// If JSON parsing fails, use generic error
				}

				throw new Error(errorData?.message || errorData?.error || 'Failed to save worklog changes')
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
