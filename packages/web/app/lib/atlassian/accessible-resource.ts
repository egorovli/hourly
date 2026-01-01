/**
 * https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/#get-accessible-resources
 */
export interface AccessibleResource {
	id: string
	name: string
	url: string
	scopes: string[]
	avatarUrl: string
}
