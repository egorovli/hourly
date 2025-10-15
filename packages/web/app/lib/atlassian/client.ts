export interface Options {
	accessToken: string
	refreshToken?: string
	baseUrl?: string
}

export interface MeResponse {
	account_type: string
	account_id: string
	email: string
	name?: string
	picture?: string
	account_status: string
	nickname?: string
	zoneinfo?: string
	locale?: string
	extended_profile?: {
		job_title?: string
		organization?: string
		department?: string
		location?: string
	}
	last_updated: string
	email_verified: boolean
}

export interface AccessibleResource {
	id: string
	name: string
	url: string
	scopes?: string[]
}

export interface ListJiraProjectsParams {
	startAt?: number
	maxResults?: number
	query?: string
}

export interface JiraProject {
	id: string
	key: string
	name: string
}

export interface ListJiraProjectsResponse {
	projects: JiraProject[]
}

export class AtlassianClient {
	private readonly baseUrl: string = 'https://api.atlassian.com'
	private readonly accessToken: string
	private readonly refreshToken?: string

	constructor(options: Options) {
		this.accessToken = options.accessToken
		this.refreshToken = options.refreshToken
		this.baseUrl = options.baseUrl ?? this.baseUrl
	}

	async getMe(): Promise<MeResponse> {
		const response = await fetch(`${this.baseUrl}/me`, {
			headers: {
				Authorization: `Bearer ${this.accessToken}`
			}
		})

		if (!response.ok) {
			throw new Error('Failed to fetch user profile')
		}

		return response.json() as Promise<MeResponse>
	}

	/**
	 * Returns the list of Atlassian resources (e.g., Jira cloud sites) the token has access to.
	 * https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/#rate-limiting
	 */
	async getAccessibleResources(): Promise<AccessibleResource[]> {
		const response = await fetch(`${this.baseUrl}/oauth/token/accessible-resources`, {
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
				Accept: 'application/json'
			}
		})

		if (!response.ok) {
			throw new Error('Failed to fetch accessible resources')
		}

		return response.json() as Promise<AccessibleResource[]>
	}

	/**
	 * Lists Jira projects for a given cloudId (accessible resource id).
	 * Note: Requires appropriate Jira scopes on the token (e.g., read:jira-work).
	 */
	async listJiraProjects(
		cloudId: string,
		params?: ListJiraProjectsParams
	): Promise<ListJiraProjectsResponse> {
		const startAt = params?.startAt ?? 0
		const maxResults = Math.min(Math.max(params?.maxResults ?? 50, 1), 100)
		const query = params?.query?.trim()

		const url = new URL(`${this.baseUrl}/ex/jira/${cloudId}/rest/api/3/project/search`)
		url.searchParams.set('startAt', String(startAt))
		url.searchParams.set('maxResults', String(maxResults))

		if (query) {
			url.searchParams.set('query', query)
		}

		const response = await fetch(url.toString(), {
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
				Accept: 'application/json'
			}
		})

		if (!response.ok) {
			throw new Error('Failed to fetch Jira projects')
		}

		const data = (await response.json()) as {
			values?: JiraProject[]
		}

		return { projects: data.values ?? [] }
	}
}
