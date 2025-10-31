/**
 * Types for worklog entry updates
 */

import type { LocalWorklogEntry } from '~/entities/worklog/index.ts'

export interface WorklogChangesRequest {
	newEntries: LocalWorklogEntry[]
	modifiedEntries: LocalWorklogEntry[]
	deletedEntries: LocalWorklogEntry[]
	dateRange?: {
		from: string
		to: string
	}
}

export interface WorklogChangesResponse {
	success: boolean
	updatedCount: number
	results: {
		created: {
			success: number
			failed: number
			errors: Array<{ entry: unknown; error: string }>
		}
		updated: {
			success: number
			failed: number
			errors: Array<{ entry: unknown; error: string }>
		}
		deleted: {
			success: number
			failed: number
			errors: Array<{ entry: unknown; error: string }>
		}
	}
	summary: {
		totalSuccess: number
		totalFailed: number
		totalProcessed: number
	}
	message: string
}

export interface WorklogChangesError {
	error?: string
	message?: string
	errors?: Record<string, unknown>
}
