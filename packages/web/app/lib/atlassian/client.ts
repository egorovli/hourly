import type { AccessibleResource } from './accessible-resource.ts'
import type { JiraUser } from './jira-user.ts'
import type { Project } from './project.ts'
import type { User } from './user.ts'

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

type GetUsersForProjectsPaginatedParams = GetUsersForProjectsParams & PaginationParams

const DEFAULT_BASE_URL = 'https://api.atlassian.com'

// biome-ignore lint/style/noProcessEnv: Version from environment is fine here
const DEFAULT_USER_AGENT = `egorovli/hourly@${process.env.VERSION ?? 'unknown'}`

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
}
