/**
 * Types for worklog entry updates
 */

export interface WorklogUpdate {
	eventId: string
	issueKey: string
	started: string
	timeSpentSeconds: number
}

export interface UpdateWorklogsRequest {
	updates: WorklogUpdate[]
}

export interface UpdateWorklogsResponse {
	success: boolean
	updatedCount: number
	message: string
}

export interface UpdateWorklogsError {
	error: string
	message: string
}
