export interface DraggableIssue {
	id: string
	key: string
	summary: string
	projectKey: string
	projectName: string
}

export interface JiraIssueSearchPanelProps {
	userId: string
	projectIds: string[]
	relevantIssues?: DraggableIssue[]
	referencedIssues?: DraggableIssue[]
	className?: string
}
