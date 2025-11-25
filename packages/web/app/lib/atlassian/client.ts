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
}
