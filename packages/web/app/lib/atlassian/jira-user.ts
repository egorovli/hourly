/**
 * GET /rest/api/3/user/assignable/search
 * GET /rest/api/3/user/assignable/multiProjectSearch
 */
export interface JiraUserAvatarUrls {
	'16x16': string
	'24x24': string
	'32x32': string
	'48x48': string
}

/**
 * Jira User object returned by Jira REST API v3 user endpoints
 */
export interface JiraUser {
	accountId: string
	accountType: 'atlassian' | 'app' | 'customer'
	active: boolean
	avatarUrls: JiraUserAvatarUrls
	displayName: string
	emailAddress?: string
	key?: string
	name?: string
	self: string
	timeZone?: string
	locale?: string
}
