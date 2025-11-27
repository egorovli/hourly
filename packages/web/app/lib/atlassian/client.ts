/** biome-ignore-all lint/style/noProcessEnv: We need to access env variables */

export interface AtlassianClientOptions {
	accessToken: string
	refreshToken?: string
	baseUrl?: string
	userAgent?: string
}

export interface AtlassianClientBaseRequestOptions {
	signal?: AbortSignal
	headers?: HeadersInit
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
	avatarUrl?: string
}

export interface JiraProject {
	id: string
	key: string
	name: string
	archived?: boolean
	avatarUrls?: {
		'48x48'?: string
		'32x32'?: string
		'24x24'?: string
	}
	projectCategory?: {
		id: string
		name: string
	}
}

export interface JiraWorklog {
	id: string
	issueId: string
	started: string
	timeSpentSeconds: number
	author: {
		accountId: string
		displayName: string
	}
}

export interface JiraUser {
	accountId: string
	accountType: string
	displayName: string
	emailAddress?: string
	avatarUrls?: {
		'48x48'?: string
		'32x32'?: string
		'24x24'?: string
		'16x16'?: string
	}
	active?: boolean
}

export class AtlassianClient {
	private readonly baseUrl: string = 'https://api.atlassian.com'
	private readonly userAgent: string = `egorovli/hourly@${process.env.VERSION ?? 'unknown'}`

	private readonly accessToken: string
	private readonly refreshToken?: string

	constructor(options: AtlassianClientOptions) {
		this.baseUrl = options.baseUrl ?? this.baseUrl
		this.userAgent = options.userAgent ?? this.userAgent
		this.accessToken = options.accessToken
		this.refreshToken = options.refreshToken
	}

	async getMe(options?: AtlassianClientBaseRequestOptions): Promise<MeResponse> {
		const response = await fetch(`${this.baseUrl}/me`, {
			method: 'GET',
			signal: options?.signal,
			headers: {
				'Accept': 'application/json',
				'Authorization': `Bearer ${this.accessToken}`,
				'User-Agent': this.userAgent,
				...(options?.headers ?? {})
			}
		})

		if (!response.ok) {
			throw new Error(`Failed to fetch user info: ${response.statusText}`)
		}

		return response.json() as Promise<MeResponse>
	}

	/** biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Pagination logic requires multiple conditionals */
	async getAccessibleResources(
		options?: AtlassianClientBaseRequestOptions
	): Promise<AccessibleResource[]> {
		const allResources: AccessibleResource[] = []
		let nextUrl: string | undefined = `${this.baseUrl}/oauth/token/accessible-resources`

		while (nextUrl) {
			const response: Response = await fetch(nextUrl, {
				method: 'GET',
				signal: options?.signal,
				headers: {
					'Accept': 'application/json',
					'Authorization': `Bearer ${this.accessToken}`,
					'User-Agent': this.userAgent,
					...(options?.headers ?? {})
				}
			})

			if (!response.ok) {
				throw new Error(`Failed to fetch accessible resources: ${response.statusText}`)
			}

			const resources = (await response.json()) as AccessibleResource[]
			allResources.push(...resources)

			// Parse Link header for next page
			const linkHeader: string | null = response.headers.get('Link')
			nextUrl = undefined

			if (linkHeader) {
				// Parse RFC 5988 Link header: </path?cursor=abc>; rel="next"
				const links: string[] = linkHeader.split(',').map((link: string) => link.trim())
				for (const link of links) {
					const match: RegExpMatchArray | null = link.match(/<([^>]+)>;\s*rel="next"/i)
					const relativeUrl = match?.[1]
					if (relativeUrl) {
						// Handle both absolute and relative URLs
						nextUrl = relativeUrl.startsWith('http')
							? relativeUrl
							: `${this.baseUrl}${relativeUrl.startsWith('/') ? '' : '/'}${relativeUrl}`
						break
					}
				}
			}
		}

		return allResources
	}

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Jira pagination and error handling requires branching
	async getProjects(
		resourceId: string,
		resourceUrl: string,
		options?: AtlassianClientBaseRequestOptions
	): Promise<JiraProject[]> {
		const allProjects: JiraProject[] = []
		let startAt = 0
		const maxResults = 50
		let hasMore = true

		// biome-ignore lint/suspicious/noConsole: Debug logging
		console.log(`Fetching projects for resource ${resourceId} (cloudid: ${resourceId})`)

		while (hasMore) {
			// Use API gateway format: https://api.atlassian.com/ex/jira/{cloudid}/rest/api/2/project
			// The resourceId is the cloudid from accessible-resources endpoint
			const url = new URL(`${this.baseUrl}/ex/jira/${resourceId}/rest/api/2/project`)
			url.searchParams.set('startAt', startAt.toString())
			url.searchParams.set('maxResults', maxResults.toString())

			// biome-ignore lint/suspicious/noConsole: Debug logging
			console.log(`Making request to: ${url.toString()}`)

			const response: Response = await fetch(url.toString(), {
				method: 'GET',
				signal: options?.signal,
				headers: {
					'Accept': 'application/json',
					'Authorization': `Bearer ${this.accessToken}`,
					'User-Agent': this.userAgent,
					...(options?.headers ?? {})
				}
			})

			if (!response.ok) {
				const errorText = await response.text().catch(() => response.statusText)
				// biome-ignore lint/suspicious/noConsole: Error logging for debugging
				console.error(`Failed to fetch projects for resource ${resourceId}:`, {
					status: response.status,
					statusText: response.statusText,
					url: url.toString(),
					headers: Object.fromEntries(response.headers.entries()),
					error: errorText.substring(0, 1000)
				})
				// If resource doesn't support Jira or user doesn't have access, return empty array
				if (response.status === 403 || response.status === 404) {
					// biome-ignore lint/suspicious/noConsole: Debug logging
					console.warn(
						`Resource ${resourceId} returned ${response.status}, returning empty projects array`
					)
					return []
				}
				throw new Error(
					`Failed to fetch projects for resource ${resourceId}: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`
				)
			}

			const data = (await response.json()) as
				| JiraProject[]
				| {
						values?: JiraProject[]
						isLast?: boolean
						startAt?: number
						maxResults?: number
						total?: number
				  }

			// Handle both array response and paginated response
			if (Array.isArray(data)) {
				allProjects.push(...data)
				hasMore = false
			} else {
				// biome-ignore lint/suspicious/noConsole: Debug logging
				console.log(`Fetched projects for resource ${resourceId}:`, {
					total: data.total,
					returned: data.values?.length ?? 0,
					isLast: data.isLast
				})

				if (data.values) {
					allProjects.push(...data.values)
				}

				hasMore =
					data.isLast === false && data.values !== undefined && data.values.length === maxResults
				if (hasMore && data.startAt !== undefined) {
					startAt = data.startAt + maxResults
				} else {
					hasMore = false
				}
			}
		}

		// biome-ignore lint/suspicious/noConsole: Debug logging
		console.log(`Total projects fetched for resource ${resourceId}:`, allProjects.length)

		return allProjects
	}

	/** biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Pagination and nested iteration logic requires multiple conditionals */
	async getWorklogsForAssignedIssues(
		resourceId: string,
		options?: AtlassianClientBaseRequestOptions & {
			startedAfter?: number
			startedBefore?: number
			projectIds?: string[]
		}
	): Promise<JiraWorklog[]> {
		const allWorklogs: JiraWorklog[] = []
		const issueIds: string[] = []
		let startAt = 0
		const maxResults = 50
		let hasMore = true

		// Build JQL query with project filtering if provided
		// projectIds here are actually project keys (like "LP", "PROJ")
		// Use worklogAuthor to find issues with worklogs by current user (more direct than assignee)
		let jql = 'worklogAuthor=currentUser()'
		if (options?.projectIds && options.projectIds.length > 0) {
			// JQL uses project key with quotes for each key
			const projectKeys = options.projectIds.map(key => `"${key}"`).join(',')
			jql = `worklogAuthor=currentUser() AND project IN (${projectKeys})`
		}

		// First, fetch all issue IDs assigned to current user (minimal fields)
		// Use the enhanced search endpoint /rest/api/3/search/jql (the old /rest/api/3/search is deprecated and returns 410)
		while (hasMore) {
			const url = new URL(`${this.baseUrl}/ex/jira/${resourceId}/rest/api/3/search/jql`)
			url.searchParams.set('jql', jql)
			url.searchParams.set('fields', 'id')
			url.searchParams.set('startAt', startAt.toString())
			url.searchParams.set('maxResults', maxResults.toString())

			const response: Response = await fetch(url.toString(), {
				method: 'GET',
				signal: options?.signal,
				headers: {
					'Accept': 'application/json',
					'Authorization': `Bearer ${this.accessToken}`,
					'User-Agent': this.userAgent,
					...(options?.headers ?? {})
				}
			})

			if (!response.ok) {
				// If request was aborted, stop processing
				if (options?.signal?.aborted) {
					return []
				}
				const errorText = await response.text().catch(() => response.statusText)
				if (response.status === 403 || response.status === 404) {
					return []
				}
				throw new Error(
					`Failed to fetch issues for resource ${resourceId}: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`
				)
			}

			const data = (await response.json()) as {
				issues?: Array<{ id: string }>
				total?: number
			}

			if (data.issues) {
				for (const issue of data.issues) {
					issueIds.push(issue.id)
				}
			}

			const total = data.total ?? 0
			const returned = data.issues?.length ?? 0
			hasMore = startAt + returned < total && returned === maxResults
			if (hasMore) {
				startAt += maxResults
			}
		}

		// Then fetch worklogs for each issue
		for (const issueId of issueIds) {
			let worklogStartAt = 0
			const worklogMaxResults = 50
			let worklogHasMore = true

			while (worklogHasMore) {
				const url = new URL(
					`${this.baseUrl}/ex/jira/${resourceId}/rest/api/3/issue/${issueId}/worklog`
				)
				url.searchParams.set('startAt', worklogStartAt.toString())
				url.searchParams.set('maxResults', worklogMaxResults.toString())

				if (options?.startedAfter !== undefined) {
					url.searchParams.set('startedAfter', options.startedAfter.toString())
				}
				if (options?.startedBefore !== undefined) {
					url.searchParams.set('startedBefore', options.startedBefore.toString())
				}

				const response: Response = await fetch(url.toString(), {
					method: 'GET',
					signal: options?.signal,
					headers: {
						'Accept': 'application/json',
						'Authorization': `Bearer ${this.accessToken}`,
						'User-Agent': this.userAgent,
						...(options?.headers ?? {})
					}
				})

				if (!response.ok) {
					// Skip issues that fail (e.g., no worklogs, permissions)
					if (response.status === 404) {
						break
					}
					// If request was aborted, stop processing
					if (options?.signal?.aborted) {
						return []
					}
					// Continue to next issue on other errors
					break
				}

				const data = (await response.json()) as {
					worklogs?: Array<{
						id: string
						started: string
						timeSpentSeconds: number
						author: {
							accountId: string
							displayName: string
						}
					}>
					total?: number
					startAt?: number
					maxResults?: number
				}

				if (data.worklogs) {
					for (const worklog of data.worklogs) {
						// Jira API doesn't return issueId in worklog response, so we add it manually
						allWorklogs.push({
							id: worklog.id,
							issueId: issueId, // Add issueId from the current loop iteration
							started: worklog.started,
							timeSpentSeconds: worklog.timeSpentSeconds,
							author: {
								accountId: worklog.author.accountId,
								displayName: worklog.author.displayName
							}
						})
					}
				}

				const total = data.total ?? 0
				const returned = data.worklogs?.length ?? 0
				worklogHasMore = worklogStartAt + returned < total && returned === worklogMaxResults
				if (worklogHasMore) {
					worklogStartAt += worklogMaxResults
				}
			}
		}

		return allWorklogs
	}

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Jira pagination and query handling requires branching
	async getUsers(
		resourceId: string,
		options?: AtlassianClientBaseRequestOptions & {
			query?: string
			maxResults?: number
		}
	): Promise<JiraUser[]> {
		const allUsers: JiraUser[] = []
		let startAt = 0
		const maxResults = options?.maxResults ?? 50
		let hasMore = true

		while (hasMore) {
			const url = new URL(`${this.baseUrl}/ex/jira/${resourceId}/rest/api/3/user/search`)
			url.searchParams.set('startAt', startAt.toString())
			url.searchParams.set('maxResults', maxResults.toString())

			// Query parameter is required by the API
			// Use wildcard '*' to get all users, or use provided query to filter
			const query = options?.query ?? '*'
			url.searchParams.set('query', query)

			// biome-ignore lint/suspicious/noConsole: Debug logging
			console.log(`Fetching users for resource ${resourceId} from: ${url.toString()}`)

			const response: Response = await fetch(url.toString(), {
				method: 'GET',
				signal: options?.signal,
				headers: {
					'Accept': 'application/json',
					'Authorization': `Bearer ${this.accessToken}`,
					'User-Agent': this.userAgent,
					...(options?.headers ?? {})
				}
			})

			if (!response.ok) {
				// If request was aborted, stop processing
				if (options?.signal?.aborted) {
					return []
				}
				const errorText = await response.text().catch(() => response.statusText)
				// biome-ignore lint/suspicious/noConsole: Error logging for debugging
				console.error(`Failed to fetch users for resource ${resourceId}:`, {
					status: response.status,
					statusText: response.statusText,
					url: url.toString(),
					error: errorText.substring(0, 1000)
				})
				if (response.status === 403 || response.status === 404) {
					return []
				}
				throw new Error(
					`Failed to fetch users for resource ${resourceId}: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`
				)
			}

			const data = (await response.json()) as
				| JiraUser[]
				| {
						values?: JiraUser[]
						startAt?: number
						maxResults?: number
						total?: number
						isLast?: boolean
				  }

			// Handle both array response (legacy) and paginated response (current API)
			if (Array.isArray(data)) {
				allUsers.push(...data)
				hasMore = data.length === maxResults
				if (hasMore) {
					startAt += maxResults
				}
			} else if (data.values && Array.isArray(data.values)) {
				allUsers.push(...data.values)
				const total = data.total ?? 0
				const returned = data.values.length
				// biome-ignore lint/suspicious/noConsole: Debug logging
				console.log(
					`Fetched ${returned} users for resource ${resourceId} (total: ${total}, startAt: ${startAt})`
				)
				hasMore = !data.isLast && startAt + returned < total && returned === maxResults
				if (hasMore) {
					startAt += maxResults
				}
			} else {
				// biome-ignore lint/suspicious/noConsole: Debug logging
				console.warn(`Unexpected response format for users from resource ${resourceId}:`, data)
				hasMore = false
			}
		}

		return allUsers
	}

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Jira pagination and multi-project queries require branching
	async getUsersByProjects(
		resourceId: string,
		projectKeys: string[],
		options?: AtlassianClientBaseRequestOptions & {
			maxResults?: number
		}
	): Promise<JiraUser[]> {
		if (projectKeys.length === 0) {
			return []
		}

		const allUsers: JiraUser[] = []
		let startAt = 0
		const maxResults = options?.maxResults ?? 50
		let hasMore = true

		while (hasMore) {
			// Use assignable/multiProjectSearch endpoint which filters by project keys
			const url = new URL(
				`${this.baseUrl}/ex/jira/${resourceId}/rest/api/3/user/assignable/multiProjectSearch`
			)
			url.searchParams.set('projectKeys', projectKeys.join(','))
			url.searchParams.set('startAt', startAt.toString())
			url.searchParams.set('maxResults', maxResults.toString())

			// biome-ignore lint/suspicious/noConsole: Debug logging
			console.log(
				`Fetching users for projects ${projectKeys.join(',')} in resource ${resourceId} from: ${url.toString()}`
			)

			const response: Response = await fetch(url.toString(), {
				method: 'GET',
				signal: options?.signal,
				headers: {
					'Accept': 'application/json',
					'Authorization': `Bearer ${this.accessToken}`,
					'User-Agent': this.userAgent,
					...(options?.headers ?? {})
				}
			})

			if (!response.ok) {
				// If request was aborted, stop processing
				if (options?.signal?.aborted) {
					return []
				}
				const errorText = await response.text().catch(() => response.statusText)
				// biome-ignore lint/suspicious/noConsole: Error logging for debugging
				console.error(`Failed to fetch users for projects in resource ${resourceId}:`, {
					status: response.status,
					statusText: response.statusText,
					url: url.toString(),
					error: errorText.substring(0, 1000)
				})
				if (response.status === 403 || response.status === 404) {
					return []
				}
				throw new Error(
					`Failed to fetch users for projects in resource ${resourceId}: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`
				)
			}

			const data = (await response.json()) as JiraUser[]

			// multiProjectSearch returns a direct array of users
			if (Array.isArray(data)) {
				allUsers.push(...data)
				const returned = data.length
				// biome-ignore lint/suspicious/noConsole: Debug logging
				console.log(
					`Fetched ${returned} users for projects ${projectKeys.join(',')} in resource ${resourceId} (startAt: ${startAt})`
				)
				// If we got fewer results than maxResults, we've reached the end
				// Otherwise, continue pagination
				hasMore = returned === maxResults
				if (hasMore) {
					startAt += maxResults
				}
			} else {
				// biome-ignore lint/suspicious/noConsole: Debug logging
				console.warn(`Unexpected response format for users from resource ${resourceId}:`, data)
				hasMore = false
			}
		}

		return allUsers
	}
}
