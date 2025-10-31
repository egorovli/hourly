export type JiraIssueMatchReason = 'activity' | 'commit' | 'worklog' | 'search'

export interface DraggableIssue {
	id: string
	key: string
	summary: string
	projectKey: string
	projectName: string
	reasons: JiraIssueMatchReason[]
	status?: string
	assignee?: string
	reporter?: string
	created?: string
	updated?: string
}

export interface JiraIssueSearchPanelProps {
	userId: string
	projectIds: string[]
	relevantIssues?: DraggableIssue[]
	referencedIssues?: DraggableIssue[]
	issueKeysInCalendar?: Set<string>
	className?: string
	onIssueDragStart?: (issue: DraggableIssue) => void
	onIssueDragEnd?: () => void
}
