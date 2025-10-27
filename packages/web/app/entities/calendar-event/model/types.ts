/**
 * Calendar event representation for worklog entries
 * Compatible with react-big-calendar
 */
export interface WorklogCalendarEvent {
	id: string
	title: string
	start: Date
	end: Date
	resource: {
		issueKey: string
		issueSummary: string
		projectName: string
		authorName: string
		timeSpentSeconds: number
		started: string
	}
}
