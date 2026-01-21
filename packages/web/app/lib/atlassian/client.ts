import type { AccessibleResource } from './accessible-resource.ts'
import type { IssueSearchApiResponse, SearchIssuesParams, SearchIssuesResult } from './issue.ts'
import type { JiraUser } from './jira-user.ts'
import type { Project } from './project.ts'
import type { User } from './user.ts'
import type { WorklogEntry, WorklogEntryPage } from './worklog-entry.ts'

import { DateTime } from 'luxon'

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

export interface GetUsersByAccountIdsParams extends AtlassianClientRequestOptions {
	/**
	 * The ID of the accessible resource (Jira site)
	 */
	accessibleResourceId: AccessibleResource['id']
	/**
	 * Array of account IDs to look up (max 200 per request)
	 */
	accountIds: string[]
}

export interface GetWorklogEntriesParams extends AtlassianClientRequestOptions, PaginationParams {
	accessibleResourceId: AccessibleResource['id']
	projectKeys?: Project['key'][]
	userAccountIds?: JiraUser['accountId'][]
	from: string
	to: string
	query?: string
}

/**
 * Input for creating or updating a worklog entry.
 * See: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-worklogs/
 */
export interface WorklogEntryInput {
	worklogId?: string
	issueIdOrKey: string
	timeSpentSeconds: number
	started: string
	comment?: string | AtlassianDocumentFormat
}

/**
 * Atlassian Document Format (ADF) for rich text content.
 * See: https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/
 */
export interface AtlassianDocumentFormat {
	type: 'doc'
	version: 1
	content: AtlassianDocumentNode[]
}

interface AtlassianDocumentNode {
	type: string
	content?: AtlassianDocumentNode[]
	text?: string
	attrs?: Record<string, unknown>
}

export interface WorklogSaveResult {
	input: WorklogEntryInput
	success: boolean
	worklog?: WorklogEntry
	error?: string
	statusCode?: number
}

export interface SaveWorklogEntriesResult {
	results: WorklogSaveResult[]
	successCount: number
	failureCount: number
	totalCount: number
}

/**
 * Input for deleting a worklog entry.
 */
export interface WorklogDeleteInput {
	worklogId: string
	issueIdOrKey: string
}

/**
 * Result of a single worklog deletion operation.
 */
export interface WorklogDeleteResult {
	input: WorklogDeleteInput
	success: boolean
	error?: string
	statusCode?: number
}

/**
 * Aggregated results from batch worklog deletion.
 */
export interface DeleteWorklogEntriesResult {
	results: WorklogDeleteResult[]
	successCount: number
	failureCount: number
	totalCount: number
}

/**
 * Parameters for batch deleting worklog entries.
 */
export interface DeleteWorklogEntriesParams extends AtlassianClientRequestOptions {
	accessibleResourceId: AccessibleResource['id']
	entries: WorklogDeleteInput[]
	concurrency?: number
	batchDelayMs?: number
	stopOnError?: boolean
}

/**
 * Parameters for batch saving worklog entries with idempotent support.
 * Uses prefetching and matching to prevent duplicates when resubmitting.
 */
export interface SaveWorklogEntriesParams extends AtlassianClientRequestOptions {
	accessibleResourceId: AccessibleResource['id']
	entries: WorklogEntryInput[]
	concurrency?: number
	batchDelayMs?: number
	stopOnError?: boolean
	idempotent?: boolean
	startedToleranceMs?: number
	currentUserAccountId?: string
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

interface JiraWorklogResponse {
	id: string
	issueId: string
	author?: JiraWorklogAuthor
	updateAuthor?: JiraWorklogAuthor
	timeSpent?: string
	timeSpentSeconds: number
	started: string
	created?: string
	updated?: string
	comment?: unknown
	self?: string
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
	 * Retrieves users by their account IDs using the Jira bulk user endpoint.
	 * This method can look up any user, including deactivated users and those
	 * not assignable to projects. Useful for resolving actor information in audit logs.
	 *
	 * @param params - The parameters for the request
	 * @returns Array of JiraUser objects (may be fewer than requested if some IDs are invalid)
	 *
	 * @example
	 * ```ts
	 * const users = await client.getUsersByAccountIds({
	 *   accessibleResourceId: 'resource-id',
	 *   accountIds: ['5b10a2844c20165700ede21g', '5b10ac8d82e05b22cc7d4ef5']
	 * })
	 * ```
	 */
	async getUsersByAccountIds(params: GetUsersByAccountIdsParams): Promise<JiraUser[]> {
		const { accessibleResourceId, accountIds, signal, headers } = params

		if (accountIds.length === 0) {
			return []
		}

		// Jira bulk endpoint has a limit of 200 account IDs per request
		const maxBatchSize = 200
		const allUsers: JiraUser[] = []

		for (let i = 0; i < accountIds.length; i += maxBatchSize) {
			const batch = accountIds.slice(i, i + maxBatchSize)

			const searchParams = new URLSearchParams()
			for (const id of batch) {
				searchParams.append('accountId', id)
			}

			const url = `${this.baseUrl}/ex/jira/${accessibleResourceId}/rest/api/3/user/bulk?${searchParams}`

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
				throw new Error(`Failed to fetch users by account IDs: ${response.status} ${errorText}`)
			}

			const result = (await response.json()) as { values: JiraUser[] }
			allUsers.push(...result.values)
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
					'Cache-Control': 'no-cache, no-store, must-revalidate',
					'Pragma': 'no-cache',
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
						'Cache-Control': 'no-cache, no-store, must-revalidate',
						'Pragma': 'no-cache',
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
						'Cache-Control': 'no-cache, no-store, must-revalidate',
						'Pragma': 'no-cache',
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

	/**
	 * Saves multiple worklog entries in batches with controlled concurrency.
	 *
	 * This method efficiently processes worklog create/update operations by:
	 * - Running multiple requests concurrently (controlled by `concurrency` param)
	 * - Handling partial failures gracefully (returns detailed results for each entry)
	 * - Adding delays between batches to avoid rate limiting
	 *
	 * Since Jira Cloud does not support bulk worklog creation, each entry is processed
	 * individually, but concurrency allows for efficient throughput.
	 *
	 * @param params - Parameters including accessibleResourceId, entries, and concurrency options
	 * @returns Promise resolving to aggregated results with success/failure counts
	 *
	 * @example
	 * ```ts
	 * const result = await client.saveWorklogEntries({
	 *   accessibleResourceId: 'resource-id',
	 *   entries: [
	 *     { issueIdOrKey: 'PROJ-123', timeSpentSeconds: 3600, started: '2024-01-15T09:00:00.000+0000' },
	 *     { issueIdOrKey: 'PROJ-456', timeSpentSeconds: 7200, started: '2024-01-15T14:00:00.000+0000', comment: 'Bug fix' }
	 *   ],
	 *   concurrency: 5
	 * })
	 *
	 * console.log(`Saved ${result.successCount}/${result.totalCount} worklogs`)
	 * ```
	 */
	async saveWorklogEntries(params: SaveWorklogEntriesParams): Promise<SaveWorklogEntriesResult> {
		const {
			accessibleResourceId,
			entries,
			concurrency = 5,
			batchDelayMs = 100,
			stopOnError = false,
			idempotent = true,
			startedToleranceMs = 60000,
			currentUserAccountId,
			signal,
			headers
		} = params

		if (entries.length === 0) {
			return {
				results: [],
				successCount: 0,
				failureCount: 0,
				totalCount: 0
			}
		}

		// Apply idempotency: match new entries to existing worklogs
		let processedEntries = entries
		if (idempotent) {
			processedEntries = await this.applyIdempotency(
				accessibleResourceId,
				entries,
				startedToleranceMs,
				currentUserAccountId,
				signal,
				headers
			)
		}

		const results: WorklogSaveResult[] = []
		const normalizedConcurrency = Math.max(1, Math.min(concurrency, 20))

		for (
			let batchStart = 0;
			batchStart < processedEntries.length;
			batchStart += normalizedConcurrency
		) {
			if (signal?.aborted) {
				const remainingEntries = processedEntries.slice(batchStart)
				for (const input of remainingEntries) {
					results.push({
						input,
						success: false,
						error: 'Operation aborted'
					})
				}
				break
			}

			const batch = processedEntries.slice(batchStart, batchStart + normalizedConcurrency)

			const batchPromises = batch.map(input =>
				this.saveSingleWorklogEntry(accessibleResourceId, input, signal, headers)
			)

			const batchResults = await Promise.allSettled(batchPromises)

			let batchIndex = 0
			let shouldBreak = false

			for (const settledResult of batchResults) {
				const input = batch[batchIndex]
				batchIndex++

				if (input === undefined) {
					continue
				}

				if (settledResult.status === 'fulfilled') {
					results.push(settledResult.value)

					if (stopOnError && !settledResult.value.success) {
						const remainingEntries = processedEntries.slice(batchStart + batchIndex)
						for (const remainingInput of remainingEntries) {
							results.push({
								input: remainingInput,
								success: false,
								error: 'Stopped due to previous error'
							})
						}
						shouldBreak = true
						break
					}
				} else {
					results.push({
						input,
						success: false,
						error:
							settledResult.reason instanceof Error
								? settledResult.reason.message
								: String(settledResult.reason)
					})

					if (stopOnError) {
						const remainingEntries = processedEntries.slice(batchStart + batchIndex)
						for (const remainingInput of remainingEntries) {
							results.push({
								input: remainingInput,
								success: false,
								error: 'Stopped due to previous error'
							})
						}
						shouldBreak = true
						break
					}
				}
			}

			if (shouldBreak) {
				break
			}

			if (batchStart + normalizedConcurrency < processedEntries.length && batchDelayMs > 0) {
				await this.delay(batchDelayMs)
			}
		}

		const successCount = results.filter(r => r.success).length
		const failureCount = results.filter(r => !r.success).length

		return {
			results,
			successCount,
			failureCount,
			totalCount: results.length
		}
	}

	/**
	 * Deletes multiple worklog entries in batches with controlled concurrency.
	 *
	 * This method efficiently processes worklog delete operations by:
	 * - Running multiple requests concurrently (controlled by `concurrency` param)
	 * - Handling partial failures gracefully (returns detailed results for each entry)
	 * - Adding delays between batches to avoid rate limiting
	 * - Treating 404 responses as success (worklog already deleted - idempotent behavior)
	 *
	 * @param params - Parameters including accessibleResourceId, entries, and concurrency options
	 * @returns Promise resolving to aggregated results with success/failure counts
	 *
	 * @example
	 * ```ts
	 * const result = await client.deleteWorklogEntries({
	 *   accessibleResourceId: 'resource-id',
	 *   entries: [
	 *     { worklogId: '12345', issueIdOrKey: 'PROJ-123' },
	 *     { worklogId: '67890', issueIdOrKey: 'PROJ-456' }
	 *   ],
	 *   concurrency: 5
	 * })
	 *
	 * console.log(`Deleted ${result.successCount}/${result.totalCount} worklogs`)
	 * ```
	 */
	async deleteWorklogEntries(
		params: DeleteWorklogEntriesParams
	): Promise<DeleteWorklogEntriesResult> {
		const {
			accessibleResourceId,
			entries,
			concurrency = 5,
			batchDelayMs = 100,
			stopOnError = false,
			signal,
			headers
		} = params

		if (entries.length === 0) {
			return {
				results: [],
				successCount: 0,
				failureCount: 0,
				totalCount: 0
			}
		}

		const results: WorklogDeleteResult[] = []
		const normalizedConcurrency = Math.max(1, Math.min(concurrency, 20))

		for (let batchStart = 0; batchStart < entries.length; batchStart += normalizedConcurrency) {
			if (signal?.aborted) {
				const remainingEntries = entries.slice(batchStart)
				for (const input of remainingEntries) {
					results.push({
						input,
						success: false,
						error: 'Operation aborted'
					})
				}
				break
			}

			const batch = entries.slice(batchStart, batchStart + normalizedConcurrency)

			const batchPromises = batch.map(input =>
				this.deleteSingleWorklogEntry(accessibleResourceId, input, signal, headers)
			)

			const batchResults = await Promise.allSettled(batchPromises)

			let batchIndex = 0
			let shouldBreak = false

			for (const settledResult of batchResults) {
				const input = batch[batchIndex]
				batchIndex++

				if (input === undefined) {
					continue
				}

				if (settledResult.status === 'fulfilled') {
					results.push(settledResult.value)

					if (stopOnError && !settledResult.value.success) {
						const remainingEntries = entries.slice(batchStart + batchIndex)
						for (const remainingInput of remainingEntries) {
							results.push({
								input: remainingInput,
								success: false,
								error: 'Stopped due to previous error'
							})
						}
						shouldBreak = true
						break
					}
				} else {
					results.push({
						input,
						success: false,
						error:
							settledResult.reason instanceof Error
								? settledResult.reason.message
								: String(settledResult.reason)
					})

					if (stopOnError) {
						const remainingEntries = entries.slice(batchStart + batchIndex)
						for (const remainingInput of remainingEntries) {
							results.push({
								input: remainingInput,
								success: false,
								error: 'Stopped due to previous error'
							})
						}
						shouldBreak = true
						break
					}
				}
			}

			if (shouldBreak) {
				break
			}

			if (batchStart + normalizedConcurrency < entries.length && batchDelayMs > 0) {
				await this.delay(batchDelayMs)
			}
		}

		const successCount = results.filter(r => r.success).length
		const failureCount = results.filter(r => !r.success).length

		return {
			results,
			successCount,
			failureCount,
			totalCount: results.length
		}
	}

	/**
	 * Deletes a single worklog entry.
	 * Treats 404 as success (worklog already deleted - idempotent behavior).
	 */
	private async deleteSingleWorklogEntry(
		accessibleResourceId: string,
		input: WorklogDeleteInput,
		signal?: AbortSignal,
		headers?: HeadersInit
	): Promise<WorklogDeleteResult> {
		const { worklogId, issueIdOrKey } = input

		if (worklogId.trim().length === 0) {
			return {
				input,
				success: false,
				error: 'worklogId is required'
			}
		}

		if (issueIdOrKey.trim().length === 0) {
			return {
				input,
				success: false,
				error: 'issueIdOrKey is required'
			}
		}

		const url = `${this.baseUrl}/ex/jira/${accessibleResourceId}/rest/api/3/issue/${issueIdOrKey}/worklog/${worklogId}`

		try {
			const response = await fetch(url, {
				method: 'DELETE',
				signal,
				headers: {
					'Accept': 'application/json',
					'Authorization': `Bearer ${this.accessToken}`,
					'User-Agent': this.userAgent,
					...(headers ?? {})
				}
			})

			// 204 No Content = successful deletion
			// 404 Not Found = worklog already deleted (treat as success for idempotency)
			if (response.status === 204 || response.status === 404) {
				return {
					input,
					success: true,
					statusCode: response.status
				}
			}

			if (!response.ok) {
				const errorText = await response.text().catch(() => response.statusText)
				return {
					input,
					success: false,
					error: `Delete failed: ${response.status} ${errorText}`,
					statusCode: response.status
				}
			}

			return {
				input,
				success: true,
				statusCode: response.status
			}
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				return {
					input,
					success: false,
					error: 'Request aborted'
				}
			}

			return {
				input,
				success: false,
				error: error instanceof Error ? error.message : String(error)
			}
		}
	}

	/**
	 * Saves a single worklog entry (create or update).
	 */
	private async saveSingleWorklogEntry(
		accessibleResourceId: string,
		input: WorklogEntryInput,
		signal?: AbortSignal,
		headers?: HeadersInit
	): Promise<WorklogSaveResult> {
		const { worklogId, issueIdOrKey, timeSpentSeconds, started, comment } = input

		if (timeSpentSeconds <= 0) {
			return {
				input,
				success: false,
				error: 'timeSpentSeconds must be greater than 0'
			}
		}

		if (issueIdOrKey.trim().length === 0) {
			return {
				input,
				success: false,
				error: 'issueIdOrKey is required'
			}
		}

		const body: Record<string, unknown> = {
			timeSpentSeconds,
			started: this.formatDateForJira(started)
		}

		if (comment !== undefined) {
			body['comment'] = this.formatComment(comment)
		}

		const isUpdate = worklogId !== undefined && worklogId.trim().length > 0
		const url = isUpdate
			? `${this.baseUrl}/ex/jira/${accessibleResourceId}/rest/api/3/issue/${issueIdOrKey}/worklog/${worklogId}`
			: `${this.baseUrl}/ex/jira/${accessibleResourceId}/rest/api/3/issue/${issueIdOrKey}/worklog`

		try {
			const response = await fetch(url, {
				method: isUpdate ? 'PUT' : 'POST',
				signal,
				headers: {
					'Accept': 'application/json',
					'Authorization': `Bearer ${this.accessToken}`,
					'Content-Type': 'application/json',
					'User-Agent': this.userAgent,
					...(headers ?? {})
				},
				body: JSON.stringify(body)
			})

			if (!response.ok) {
				const errorText = await response.text().catch(() => response.statusText)
				return {
					input,
					success: false,
					error: `${isUpdate ? 'Update' : 'Create'} failed: ${response.status} ${errorText}`,
					statusCode: response.status
				}
			}

			const payload = (await response.json()) as JiraWorklogResponse

			return {
				input,
				success: true,
				worklog: this.mapJiraWorklogToEntry(payload, issueIdOrKey),
				statusCode: response.status
			}
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				return {
					input,
					success: false,
					error: 'Request aborted'
				}
			}

			return {
				input,
				success: false,
				error: error instanceof Error ? error.message : String(error)
			}
		}
	}

	/**
	 * Applies idempotency by matching new entries to existing worklogs.
	 * Returns entries with worklogId populated for matches.
	 */
	private async applyIdempotency(
		accessibleResourceId: string,
		entries: WorklogEntryInput[],
		toleranceMs: number,
		currentUserAccountId: string | undefined,
		signal: AbortSignal | undefined,
		headers: HeadersInit | undefined
	): Promise<WorklogEntryInput[]> {
		// Separate entries with and without worklogId
		const newEntries = entries.filter(
			e => e.worklogId === undefined || e.worklogId.trim().length === 0
		)
		const existingEntries = entries.filter(
			e => e.worklogId !== undefined && e.worklogId.trim().length > 0
		)

		// If no new entries, nothing to deduplicate
		if (newEntries.length === 0) {
			return entries
		}

		// Group new entries by issue
		const entriesByIssue = new Map<string, WorklogEntryInput[]>()
		for (const entry of newEntries) {
			const key = entry.issueIdOrKey
			const group = entriesByIssue.get(key) ?? []
			group.push(entry)
			entriesByIssue.set(key, group)
		}

		// Fetch existing worklogs for each issue
		const existingWorklogsByIssue = new Map<string, JiraWorklog[]>()

		for (const issueIdOrKey of entriesByIssue.keys()) {
			try {
				const worklogs = await this.fetchWorklogsForIssue(
					accessibleResourceId,
					issueIdOrKey,
					signal,
					headers
				)
				existingWorklogsByIssue.set(issueIdOrKey, worklogs)
			} catch {
				// If we can't fetch worklogs, continue without deduplication for this issue
				existingWorklogsByIssue.set(issueIdOrKey, [])
			}
		}

		// Match new entries to existing worklogs
		const processedNewEntries: WorklogEntryInput[] = []

		for (const entry of newEntries) {
			const existingWorklogs = existingWorklogsByIssue.get(entry.issueIdOrKey) ?? []
			const matchedWorklog = this.findMatchingWorklog(
				entry,
				existingWorklogs,
				toleranceMs,
				currentUserAccountId
			)

			if (matchedWorklog) {
				// Convert create to update
				processedNewEntries.push({
					...entry,
					worklogId: matchedWorklog.id ?? matchedWorklog.worklogId?.toString()
				})
			} else {
				processedNewEntries.push(entry)
			}
		}

		// Combine existing entries (already have worklogId) with processed new entries
		return [...existingEntries, ...processedNewEntries]
	}

	/**
	 * Fetches all worklogs for a specific issue.
	 */
	private async fetchWorklogsForIssue(
		accessibleResourceId: string,
		issueIdOrKey: string,
		signal: AbortSignal | undefined,
		headers: HeadersInit | undefined
	): Promise<JiraWorklog[]> {
		const allWorklogs: JiraWorklog[] = []
		let startAt = 0
		const maxResults = 1000
		let hasMore = true

		while (hasMore) {
			const url = new URL(
				`${this.baseUrl}/ex/jira/${accessibleResourceId}/rest/api/3/issue/${issueIdOrKey}/worklog`
			)
			url.searchParams.set('startAt', startAt.toString())
			url.searchParams.set('maxResults', maxResults.toString())

			const response = await fetch(url.toString(), {
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
				throw new Error(`Failed to fetch worklogs for issue ${issueIdOrKey}: ${response.status}`)
			}

			const payload = (await response.json()) as {
				worklogs: JiraWorklog[]
				total: number
				startAt: number
				maxResults: number
			}

			allWorklogs.push(...payload.worklogs)

			if (payload.worklogs.length < maxResults || allWorklogs.length >= payload.total) {
				hasMore = false
			} else {
				startAt += payload.worklogs.length
			}
		}

		return allWorklogs
	}

	/**
	 * Finds a matching worklog based on started time and optional author.
	 */
	private findMatchingWorklog(
		entry: WorklogEntryInput,
		existingWorklogs: JiraWorklog[],
		toleranceMs: number,
		currentUserAccountId: string | undefined
	): JiraWorklog | undefined {
		const entryStarted = Date.parse(entry.started)
		if (Number.isNaN(entryStarted)) {
			return undefined
		}

		for (const worklog of existingWorklogs) {
			const worklogStarted = Date.parse(worklog.started)
			if (Number.isNaN(worklogStarted)) {
				continue
			}

			// Check started time within tolerance
			const timeDiff = Math.abs(entryStarted - worklogStarted)
			if (timeDiff > toleranceMs) {
				continue
			}

			// If currentUserAccountId is provided, also match by author
			if (
				currentUserAccountId !== undefined &&
				worklog.author?.accountId !== currentUserAccountId
			) {
				continue
			}

			// Found a match
			return worklog
		}

		return undefined
	}

	/**
	 * Searches for Jira issues using JQL with support for text search and user relevance.
	 *
	 * When a search query is provided, it prioritizes matching issue keys, summaries, and descriptions.
	 * When no query is provided, it returns issues relevant to the specified users (assigned or reported).
	 *
	 * @param params - Search parameters including projectKeys, userAccountIds, dateRange, and query
	 * @returns Promise resolving to paginated issue results
	 *
	 * @example
	 * ```ts
	 * // Text search
	 * const results = await client.searchIssues({
	 *   accessibleResourceId: 'resource-id',
	 *   projectKeys: ['PROJ'],
	 *   query: 'authentication bug',
	 *   maxResults: 20
	 * })
	 *
	 * // Relevance search (issues for specific users)
	 * const results = await client.searchIssues({
	 *   accessibleResourceId: 'resource-id',
	 *   projectKeys: ['PROJ'],
	 *   userAccountIds: ['user-account-id'],
	 *   dateFrom: '2024-01-01',
	 *   dateTo: '2024-01-31'
	 * })
	 * ```
	 */
	async searchIssues(params: SearchIssuesParams): Promise<SearchIssuesResult> {
		const {
			accessibleResourceId,
			projectKeys,
			userAccountIds,
			dateFrom,
			dateTo,
			query,
			nextPageToken,
			maxResults = 50,
			signal,
			headers
		} = params

		const jqlParts: string[] = []
		const quoteJqlValue = (value: string) =>
			`"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

		// Text search takes priority when provided
		const trimmedQuery = query?.trim()

		// Check if query looks like an issue key (e.g., "PROJ-123")
		// Issue key pattern: one or more uppercase letters, dash, one or more digits
		const isIssueKey = trimmedQuery && /^[A-Z]+-\d+$/i.test(trimmedQuery)

		// Determine if we should apply filters or bypass them
		// When searching by issue key or text, bypass date range and user filters
		// to allow users to find any issue regardless of current filter state
		const hasTextSearch = trimmedQuery && trimmedQuery.length > 0

		// Filter by projects (always applied for security/access control)
		// Exception: when searching by issue key, we don't restrict by project
		// because the user is explicitly looking for a specific issue
		if (!isIssueKey && projectKeys && projectKeys.length > 0) {
			jqlParts.push(`project in (${projectKeys.map(quoteJqlValue).join(',')})`)
		}

		if (trimmedQuery && trimmedQuery.length > 0) {
			if (isIssueKey) {
				// Direct key match - no project filter needed, key is globally unique
				jqlParts.push(`key = ${quoteJqlValue(trimmedQuery.toUpperCase())}`)
			} else {
				// Full-text search on summary and description
				jqlParts.push(`text ~ ${quoteJqlValue(trimmedQuery)}`)
			}
		} else if (userAccountIds && userAccountIds.length > 0) {
			// No text query - filter by user relevance (assignee or reporter)
			const userList = userAccountIds.map(quoteJqlValue).join(',')
			jqlParts.push(`(assignee in (${userList}) OR reporter in (${userList}))`)
		}

		// Apply date range filter ONLY when not searching by text
		// When user is actively searching, they want to find issues regardless of date
		// Date range is only useful for browsing/relevance mode (no query)
		if (!hasTextSearch && (dateFrom || dateTo)) {
			const fromDate = dateFrom ? DateTime.fromISO(dateFrom) : undefined
			const toDate = dateTo ? DateTime.fromISO(dateTo) : undefined
			const fromStr = fromDate?.isValid ? quoteJqlValue(fromDate.toFormat('yyyy-MM-dd')) : undefined
			const toStr = toDate?.isValid ? quoteJqlValue(toDate.toFormat('yyyy-MM-dd')) : undefined

			if (fromStr || toStr) {
				// Uses multiple date fields to catch all relevant issues:
				// - created: issue was created in the range
				// - updated: issue had any update in the range
				// - resolutiondate: issue was resolved in the range
				// - worklogDate: worklogs were added in the range
				// - duedate: issue is due in the range
				const dateFields = ['created', 'updated', 'resolutiondate', 'worklogDate', 'duedate']
				const orConditions: string[] = []

				for (const field of dateFields) {
					const fieldConditions: string[] = []
					if (fromStr) {
						fieldConditions.push(`${field} >= ${fromStr}`)
					}
					if (toStr) {
						fieldConditions.push(`${field} <= ${toStr}`)
					}
					if (fieldConditions.length > 0) {
						orConditions.push(`(${fieldConditions.join(' AND ')})`)
					}
				}

				if (orConditions.length > 0) {
					jqlParts.push(`(${orConditions.join(' OR ')})`)
				}
			}
		}

		// Build the full JQL query
		const jql =
			jqlParts.length > 0
				? `${jqlParts.join(' AND ')} ORDER BY updated DESC`
				: 'ORDER BY updated DESC'

		const requestBody: Record<string, unknown> = {
			jql,
			maxResults: Math.min(maxResults, 100),
			fields: [
				'summary',
				'description',
				'issuetype',
				'status',
				'priority',
				'assignee',
				'reporter',
				'created',
				'updated',
				'resolutiondate',
				'duedate',
				'project',
				'timespent'
			]
		}

		if (nextPageToken) {
			requestBody['nextPageToken'] = nextPageToken
		}

		const response = await fetch(
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
				body: JSON.stringify(requestBody)
			}
		)

		if (!response.ok) {
			const errorText = await response.text().catch(() => response.statusText)
			throw new Error(`Failed to search issues: ${response.status} ${errorText}`)
		}

		const payload = (await response.json()) as IssueSearchApiResponse

		return {
			issues: payload.issues,
			maxResults: payload.maxResults,
			total: payload.total,
			isLast: payload.isLast ?? true,
			nextPageToken: payload.nextPageToken
		}
	}

	/**
	 * Formats a date string to the format Jira expects: yyyy-MM-dd'T'HH:mm:ss.SSSZ
	 * Converts ISO 8601 'Z' suffix to '+0000' timezone offset format using Luxon.
	 */
	private formatDateForJira(dateString: string): string {
		const dt = DateTime.fromISO(dateString, { setZone: true })

		if (!dt.isValid) {
			// If parsing fails, return the original string
			return dateString
		}

		// Format with ZZ token (gives +00:00) and remove the colon from the offset
		// Jira expects: yyyy-MM-dd'T'HH:mm:ss.SSS+0000 (no colon in offset)
		const formatted = dt.toFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZZ")

		// Remove the colon from the timezone offset (last 6 chars: +00:00 → +0000)
		return formatted.replace(/([+-]\d{2}):(\d{2})$/, '$1$2')
	}

	/**
	 * Formats a comment into Atlassian Document Format (ADF).
	 */
	private formatComment(comment: string | AtlassianDocumentFormat): AtlassianDocumentFormat {
		if (typeof comment === 'object' && comment.type === 'doc') {
			return comment
		}

		return {
			type: 'doc',
			version: 1,
			content: [
				{
					type: 'paragraph',
					content: [
						{
							type: 'text',
							text: String(comment)
						}
					]
				}
			]
		}
	}

	/**
	 * Maps a Jira worklog API response to our WorklogEntry type.
	 */
	private mapJiraWorklogToEntry(payload: JiraWorklogResponse, issueIdOrKey: string): WorklogEntry {
		return {
			id: payload.id,
			issueId: payload.issueId,
			issueKey: issueIdOrKey,
			issueSummary: '',
			timeSpentSeconds: payload.timeSpentSeconds,
			started: payload.started,
			created: payload.created,
			updated: payload.updated,
			authorAccountId: payload.author?.accountId,
			authorDisplayName: payload.author?.displayName,
			comment: payload.comment
		}
	}

	/**
	 * Simple delay utility for rate limiting.
	 */
	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms))
	}
}
