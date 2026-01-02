/**
 * Jira Issue Search Types
 *
 * Types for issue search API responses and related data structures.
 * Based on Jira REST API v3 /search/jql endpoint.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search
 */

export interface JiraIssueType {
	id: string
	name: string
	iconUrl?: string
	description?: string
	subtask?: boolean
}

export interface JiraIssueStatusCategory {
	id: number
	key: string
	colorName: string
	name: string
}

export interface JiraIssueStatus {
	id: string
	name: string
	iconUrl?: string
	description?: string
	statusCategory?: JiraIssueStatusCategory
}

export interface JiraIssuePriority {
	id: string
	name: string
	iconUrl?: string
}

export interface JiraIssueUser {
	accountId: string
	displayName: string
	emailAddress?: string
	avatarUrls?: Record<string, string>
	active?: boolean
}

export interface JiraIssueFields {
	summary: string
	description?: unknown
	issuetype?: JiraIssueType
	status?: JiraIssueStatus
	priority?: JiraIssuePriority
	assignee?: JiraIssueUser
	reporter?: JiraIssueUser
	created?: string
	updated?: string
	/** Date when the issue was resolved (ISO 8601) */
	resolutiondate?: string
	/** Due date for the issue (ISO 8601) */
	duedate?: string
	project?: {
		id: string
		key: string
		name: string
		avatarUrls?: Record<string, string>
	}
	/** Time spent on this issue in seconds */
	timespent?: number
}

export interface JiraIssueSearchResult {
	id: string
	key: string
	self: string
	fields: JiraIssueFields
}

/**
 * Response from /rest/api/3/search/jql endpoint.
 * Uses nextPageToken for pagination (not startAt).
 */
export interface IssueSearchApiResponse {
	issues: JiraIssueSearchResult[]
	maxResults: number
	total: number
	isLast?: boolean
	nextPageToken?: string
}

/**
 * Parameters for searching issues via the Atlassian client.
 */
export interface SearchIssuesParams {
	accessibleResourceId: string
	projectKeys?: string[]
	userAccountIds?: string[]
	dateFrom?: string
	dateTo?: string
	query?: string
	nextPageToken?: string
	maxResults?: number
	signal?: AbortSignal
	headers?: HeadersInit
}

/**
 * Paginated response from issue search.
 */
export interface SearchIssuesResult {
	issues: JiraIssueSearchResult[]
	maxResults: number
	total: number
	isLast: boolean
	nextPageToken?: string
}
