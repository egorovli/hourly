import type { UseInfiniteQueryResult } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

interface PageInfo {
	totalPages?: number
	total?: number
	page?: number
	hasNextPage?: boolean
}

interface PageData {
	pageInfo?: PageInfo
}

/**
 * Hook that automatically loads all pages of an infinite query until completion.
 * Returns the current loading progress.
 */
export function useAutoLoadInfiniteQuery<TData, TError>(
	query: UseInfiniteQueryResult<TData, TError>,
	options?: {
		/**
		 * Enable automatic loading. Defaults to true.
		 */
		enabled?: boolean
		/**
		 * Maximum number of pages to auto-load. Prevents runaway loading.
		 * Defaults to 100.
		 */
		maxPages?: number
	}
) {
	const { enabled = true, maxPages = 100 } = options ?? {}
	const loadedPagesRef = useRef(0)
	const isLoadingRef = useRef(false)

	const currentPageCount = (query.data as { pages?: unknown[] } | undefined)?.pages?.length ?? 0
	const firstPage = (query.data as { pages?: PageData[] } | undefined)?.pages?.[0]
	const totalPages = firstPage?.pageInfo?.totalPages ?? null

	useEffect(() => {
		// Don't proceed if disabled, already loading, no more pages, or max pages reached
		if (
			!enabled ||
			isLoadingRef.current ||
			!query.hasNextPage ||
			query.isFetchingNextPage ||
			query.isError ||
			loadedPagesRef.current >= maxPages
		) {
			return
		}

		// Auto-fetch next page
		isLoadingRef.current = true
		void query
			.fetchNextPage()
			.then(() => {
				loadedPagesRef.current += 1
			})
			.finally(() => {
				isLoadingRef.current = false
			})
	}, [enabled, query.hasNextPage, query.isFetchingNextPage, query.isError, maxPages, query])

	return {
		/**
		 * Whether the query is currently auto-loading pages
		 */
		isAutoLoading: enabled && (query.hasNextPage || query.isFetchingNextPage),
		/**
		 * Number of pages currently loaded
		 */
		pagesLoaded: currentPageCount,
		/**
		 * Total number of pages (if known from API)
		 */
		totalPages,
		/**
		 * Loading progress as a percentage (0-100), or null if total is unknown
		 */
		progressPercent: totalPages ? Math.round((currentPageCount / totalPages) * 100) : null
	}
}
