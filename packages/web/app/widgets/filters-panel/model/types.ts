import type { DateRange } from 'react-day-picker'
import type { UseQueryResult } from '@tanstack/react-query'

export interface FiltersPanelProps {
	// Date range filter
	dateRange?: DateRange
	onDateRangeChange: (range?: DateRange) => void

	// Jira filters
	jiraProjectsQuery: UseQueryResult<any, Error>
	selectedJiraProjectIds: string[]
	onJiraProjectIdsChange: (ids: string[]) => void

	jiraUsersQuery: UseQueryResult<any, Error>
	selectedJiraUserIds: string[]
	onJiraUserIdsChange: (ids: string[]) => void

	// GitLab filters
	gitlabProjectsQuery: UseQueryResult<any, Error>
	selectedGitlabProjectIds: string[]
	onGitlabProjectIdsChange: (ids: string[]) => void

	gitlabContributorsQuery: UseQueryResult<any, Error>
	selectedGitlabContributorIds: string[]
	onGitlabContributorIdsChange: (ids: string[]) => void

	// Conditional rendering flags
	hasJiraProjectsSelected: boolean
	hasGitlabProjectsSelected: boolean
	hasCompleteDateRange: boolean
}
