import type { AccessibleResource } from './accessible-resource.ts'
import type { JiraUser } from './jira-user.ts'
import type { Project } from './project.ts'
import type { User } from './user.ts'
import type { WorklogEntry, WorklogEntryPage } from './worklog-entry.ts'

export interface AtlassianClientOptions {
	accessToken: string
	refreshToken?: string
	baseUrl?: string
	userAgent?: string
}

export interface AtlassianClientRequestOptions {
	signal?: AbortSignal
	headers?: HeadersInit
}

interface PaginationParams {
	startAt?: number
	maxResults?: number
}

export interface GetUsersForProjectsParams extends AtlassianClientRequestOptions {
	/**
	 * The ID of the accessible resource (Jira site)
	 */
	accessibleResourceId: AccessibleResource['id']
	/**
	 * Array of project keys to search for assignable users
	 */
	projectKeys: Project['key'][]
	/**
	 * A query string used to search for users by display name or email address.
	 * The string is matched against the user's display name and email address.
	 */
	username?: string
}

export interface GetWorklogEntriesParams extends AtlassianClientRequestOptions, PaginationParams {
	accessibleResourceId: AccessibleResource['id']
	projectKeys?: Project['key'][]
	userAccountIds?: JiraUser['accountId'][]
	from: string
	to: string
	query?: string
}

type GetUsersForProjectsPaginatedParams = GetUsersForProjectsParams & PaginationParams

const DEFAULT_BASE_URL = 'https://api.atlassian.com'

// biome-ignore lint/style/noProcessEnv: Version from environment is fine here
const DEFAULT_USER_AGENT = `egorovli/hourly@${process.env.VERSION ?? 'unknown'}`

interface JiraWorklogAuthor {
	accountId: string
	displayName: string
}

interface JiraWorklog {
	worklogId?: number
	id?: string
	issueId: string
	author?: JiraWorklogAuthor
	timeSpentSeconds: number
	started: string
	created?: string
	updated?: string
	comment?: unknown
}

type JiraWorklogListResponse = JiraWorklog[]

interface JiraWorklogUpdatedResponse {
	lastPage?: boolean
	nextPage?: string
	values: {
		worklogId: number
	}[]
}

interface JiraIssueSearchResponse {
	issues: JiraIssue[]
}

interface JiraIssue {
	id: string
	key: string
	fields: {
		summary?: string
		description?: unknown
	}
}

export class AtlassianClient {
	private readonly baseUrl: string
	private readonly userAgent: string
	private readonly accessToken: string
	private readonly refreshToken?: string

	constructor(options: AtlassianClientOptions) {
		this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL
		this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT
		this.accessToken = options.accessToken
		this.refreshToken = options.refreshToken
	}

	async getAccessibleResources(
		options?: AtlassianClientRequestOptions
	): Promise<AccessibleResource[]> {
		const response = await fetch(`${this.baseUrl}/oauth/token/accessible-resources`, {
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

		return response.json() as Promise<AccessibleResource[]>
	}

	async getProjects(
		accessibleResourceId: AccessibleResource['id'],
		options?: AtlassianClientRequestOptions
	): Promise<Project[]> {
		const searchParams = new URLSearchParams({
			expand: '',
			active: 'true'
		})

		const response = await fetch(
			`${this.baseUrl}/ex/jira/${accessibleResourceId}/rest/api/3/project?${searchParams}`,
			{
				method: 'GET',
				signal: options?.signal,
				headers: {
					'Accept': 'application/json',
					'Authorization': `Bearer ${this.accessToken}`,
					'User-Agent': this.userAgent,
					...(options?.headers ?? {})
				}
			}
		)

		if (!response.ok) {
			throw new Error(
				`Failed to fetch projects for resource ${accessibleResourceId}: ${response.statusText}`
			)
		}

		return response.json() as Promise<Project[]>
	}

	async getMe(options?: AtlassianClientRequestOptions): Promise<User> {
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

		return response.json() as Promise<User>
	}

	/**
	 * Retrieves a paginated list of users who can be assigned issues in specified projects.
	 *
	 * The results can be filtered by user attributes. The operation is limited to
	 * the first 1000 users and may return fewer users than requested. Privacy controls
	 * may affect the visibility of user data.
	 *
	 * @param params - Parameters including accessibleResourceId, projectKeys, and optional filtering/pagination options
	 * @returns Promise resolving to an array of JiraUser objects
	 *
	 * @throws Error if the request fails or projectKeys array is empty
	 *
	 * @example
	 * ```ts
	 * const users = await client.getUsersForProjectsPaginated({
	 *   accessibleResourceId: 'resource-id',
	 *   projectKeys: ['PROJ1', 'PROJ2'],
	 *   username: 'john',
	 *   startAt: 0,
	 *   maxResults: 50
	 * })
	 * ```
	 */
	async getUsersForProjectsPaginated(
		params: GetUsersForProjectsPaginatedParams
	): Promise<JiraUser[]> {
		const { accessibleResourceId, projectKeys, username, startAt, maxResults, signal, headers } =
			params

		if (projectKeys.length === 0) {
			throw new Error('At least one project key is required')
		}

		const searchParams = new URLSearchParams({
			active: 'true',
			projectKeys: projectKeys.join(',')
		})

		if (username !== undefined) {
			searchParams.set('query', username)
		}

		if (startAt !== undefined) {
			searchParams.set('startAt', startAt.toString())
		}

		if (maxResults !== undefined) {
			// Clamp maxResults to API limit of 1000
			const clampedMaxResults = Math.min(Math.max(1, maxResults), 1000)
			searchParams.set('maxResults', clampedMaxResults.toString())
		}

		const url = `${this.baseUrl}/ex/jira/${accessibleResourceId}/rest/api/3/user/assignable/multiProjectSearch?${searchParams}`

		const response = await fetch(url, {
			method: 'GET',
			signal,
			headers: {
				'Accept': 'application/json',
				'Authorization': `Bearer ${this.accessToken}`,
				'User-Agent': this.userAgent,
				...(headers ?? {})
			}
		})

		if (!response.ok) {
			const errorText = await response.text().catch(() => response.statusText)
			throw new Error(
				`Failed to fetch users for projects ${projectKeys.join(', ')}: ${response.status} ${errorText}`
			)
		}

		return response.json() as Promise<JiraUser[]>
	}

	/**
	 * Retrieves all users who can be assigned issues in specified projects.
	 *
	 * This method automatically handles pagination by calling the paginated endpoint
	 * iteratively until all users are retrieved. The results can be filtered by user attributes.
	 * Privacy controls may affect the visibility of user data.
	 *
	 * @param params - Parameters including accessibleResourceId, projectKeys, and optional filtering options
	 * @returns Promise resolving to an array of all JiraUser objects
	 *
	 * @throws Error if the request fails or projectKeys array is empty
	 *
	 * @example
	 * ```ts
	 * const allUsers = await client.getUsersForProjects({
	 *   accessibleResourceId: 'resource-id',
	 *   projectKeys: ['PROJ1', 'PROJ2'],
	 *   username: 'john'
	 * })
	 * ```
	 */
	async getUsersForProjects(params: GetUsersForProjectsParams): Promise<JiraUser[]> {
		const { accessibleResourceId, projectKeys, username, signal, headers } = params

		if (projectKeys.length === 0) {
			throw new Error('At least one project key is required')
		}

		const allUsers: JiraUser[] = []
		const pageSize = 1000 // Maximum allowed by API
		let startAt = 0
		let hasMore = true

		while (hasMore) {
			const page = await this.getUsersForProjectsPaginated({
				accessibleResourceId,
				projectKeys,
				username,
				startAt,
				maxResults: pageSize,
				signal,
				headers
			})

			allUsers.push(...page)

			// If we got fewer results than requested, we've reached the end
			// Also stop if we hit the API limit of 1000 users
			if (page.length < pageSize || allUsers.length >= 1000) {
				hasMore = false
			} else {
				startAt += page.length
			}
		}

		return allUsers
	}

	/**
	 * Retrieves worklog entries for a given date range with optional filtering by projects,
	 * users, and text query. Results include issue labels for calendar display.
	 */
	async getWorklogEntries(params: GetWorklogEntriesParams): Promise<WorklogEntryPage> {
		const {
			accessibleResourceId,
			projectKeys,
			userAccountIds,
			from,
			to,
			query,
			startAt,
			maxResults,
			signal,
			headers
		} = params

		const since = Date.parse(from)
		const until = Date.parse(to)

		if (Number.isNaN(since) || Number.isNaN(until)) {
			throw new Error('Invalid date range provided')
		}

		if (until < since) {
			throw new Error('Date range must be in ascending order')
		}

		const updatedUrl = new URL(
			`${this.baseUrl}/ex/jira/${accessibleResourceId}/rest/api/3/worklog/updated`
		)
		updatedUrl.searchParams.set('since', since.toString())
		updatedUrl.searchParams.set('until', until.toString())

		const worklogIds: number[] = []
		let nextPageUrl: string | undefined = updatedUrl.toString()

		while (nextPageUrl) {
			const updatedResponse = await fetch(nextPageUrl, {
				method: 'GET',
				signal,
				headers: {
					'Accept': 'application/json',
					'Authorization': `Bearer ${this.accessToken}`,
					'User-Agent': this.userAgent,
					...(headers ?? {})
				}
			})

			if (!updatedResponse.ok) {
				const errorText = await updatedResponse.text().catch(() => updatedResponse.statusText)
				throw new Error(
					`Failed to fetch updated worklogs for resource ${accessibleResourceId}: ${updatedResponse.status} ${errorText}`
				)
			}

			const updatedPayload = (await updatedResponse.json()) as JiraWorklogUpdatedResponse

			worklogIds.push(...updatedPayload.values.map(value => value.worklogId))

			if (updatedPayload.lastPage || updatedPayload.nextPage === undefined) {
				nextPageUrl = undefined
			} else {
				nextPageUrl = updatedPayload.nextPage
			}
		}

		if (worklogIds.length === 0) {
			return {
				entries: [],
				total: 0,
				startAt: startAt ?? 0,
				maxResults: maxResults ?? 0
			}
		}

		const uniqueWorklogIds = Array.from(new Set(worklogIds))
		const worklogs: JiraWorklog[] = []
		const idChunkSize = 1000

		for (let index = 0; index < uniqueWorklogIds.length; index += idChunkSize) {
			const idChunk = uniqueWorklogIds.slice(index, index + idChunkSize)

			const listResponse = await fetch(
				`${this.baseUrl}/ex/jira/${accessibleResourceId}/rest/api/3/worklog/list`,
				{
					method: 'POST',
					signal,
					headers: {
						'Accept': 'application/json',
						'Authorization': `Bearer ${this.accessToken}`,
						'Content-Type': 'application/json',
						'User-Agent': this.userAgent,
						...(headers ?? {})
					},
					body: JSON.stringify({
						ids: idChunk
					})
				}
			)

			if (!listResponse.ok) {
				const errorText = await listResponse.text().catch(() => listResponse.statusText)
				throw new Error(
					`Failed to fetch worklog details for resource ${accessibleResourceId}: ${listResponse.status} ${errorText}`
				)
			}

			const listPayload = (await listResponse.json()) as JiraWorklogListResponse
			worklogs.push(...listPayload)
		}

		const userAccountIdSet = new Set(userAccountIds ?? [])

		const filteredWorklogs = worklogs.filter(worklog => {
			const startedAt = Date.parse(worklog.started)

			if (Number.isNaN(startedAt) || startedAt < since || startedAt > until) {
				return false
			}

			if (userAccountIdSet.size === 0) {
				return true
			}

			return (
				worklog.author?.accountId !== undefined && userAccountIdSet.has(worklog.author.accountId)
			)
		})

		const issueIds = Array.from(
			new Set(
				filteredWorklogs.map(worklog => worklog.issueId).filter(issueId => issueId.length > 0)
			)
		)

		if (issueIds.length === 0) {
			return {
				entries: [],
				total: 0,
				startAt: startAt ?? 0,
				maxResults: maxResults ?? 0
			}
		}

		const quoteJqlValue = (value: string) =>
			`"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
		const projectKeysList = projectKeys?.filter(key => key.length > 0) ?? []
		const queryValue = query?.trim()
		const issueMap = new Map<string, JiraIssue>()
		const issueIdChunks = [] as string[][]
		const chunkSize = 1000

		for (let index = 0; index < issueIds.length; index += chunkSize) {
			issueIdChunks.push(issueIds.slice(index, index + chunkSize))
		}

		for (const issueIdChunk of issueIdChunks) {
			const jqlParts = [`id in (${issueIdChunk.join(',')})`]

			if (projectKeysList.length > 0) {
				jqlParts.push(`project in (${projectKeysList.map(quoteJqlValue).join(',')})`)
			}

			if (queryValue) {
				jqlParts.push(`text ~ ${quoteJqlValue(queryValue)}`)
			}

			const searchResponse = await fetch(
				`${this.baseUrl}/ex/jira/${accessibleResourceId}/rest/api/3/search/jql`,
				{
					method: 'POST',
					signal,
					headers: {
						'Accept': 'application/json',
						'Authorization': `Bearer ${this.accessToken}`,
						'Content-Type': 'application/json',
						'User-Agent': this.userAgent,
						...(headers ?? {})
					},
					body: JSON.stringify({
						jql: jqlParts.join(' AND '),
						maxResults: issueIdChunk.length,
						fields: ['summary', 'description']
					})
				}
			)

			if (!searchResponse.ok) {
				const errorText = await searchResponse.text().catch(() => searchResponse.statusText)
				throw new Error(
					`Failed to fetch issues for worklogs: ${searchResponse.status} ${errorText}`
				)
			}

			const searchPayload = (await searchResponse.json()) as JiraIssueSearchResponse

			for (const issue of searchPayload.issues) {
				issueMap.set(issue.id, issue)
			}
		}

		const entries = filteredWorklogs
			.filter(worklog => issueMap.has(worklog.issueId))
			.map<WorklogEntry>(worklog => {
				const issue = issueMap.get(worklog.issueId)
				const worklogId = worklog.id ?? worklog.worklogId?.toString()

				return {
					id: worklogId ?? `${worklog.issueId}:${worklog.started}`,
					issueId: worklog.issueId,
					issueKey: issue?.key ?? 'UNKNOWN',
					issueSummary: issue?.fields.summary ?? 'Unknown issue',
					issueDescription: issue?.fields.description,
					authorAccountId: worklog.author?.accountId,
					authorDisplayName: worklog.author?.displayName,
					timeSpentSeconds: worklog.timeSpentSeconds,
					started: worklog.started,
					created: worklog.created,
					updated: worklog.updated,
					comment: worklog.comment
				}
			})

		const normalizedStartAt = Math.max(0, startAt ?? 0)
		const requestedMaxResults = maxResults ?? entries.length
		const normalizedMaxResults = Math.min(Math.max(1, requestedMaxResults), entries.length)
		const pagedEntries = entries.slice(normalizedStartAt, normalizedStartAt + normalizedMaxResults)

		return {
			entries: pagedEntries,
			total: entries.length,
			startAt: normalizedStartAt,
			maxResults: normalizedMaxResults
		}
	}
}
