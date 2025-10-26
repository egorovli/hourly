export interface Options {
	accessToken: string
	refreshToken?: string
	baseUrl?: string
}

export interface CurrentUserResponse {
	id: number
	username: string
	name: string
	state: string
	avatar_url?: string
	web_url: string
	created_at: string
	bio?: string
	bio_html?: string
	location?: string
	public_email?: string
	organization?: string
	pronouns?: string
	bot?: boolean
	work_information?: string
	last_sign_in_at?: string
	confirmed_at?: string
	email?: string
}

export interface ProjectListItem {
	id: number
	name: string
	name_with_namespace?: string
	path_with_namespace: string
	archived?: boolean
	last_activity_at?: string
	namespace?: { full_path?: string; kind?: string }
}

export interface ListProjectsParams {
	search?: string
	page?: number
	perPage?: number
	membership?: boolean
	withShared?: boolean
}

export interface GitLabCommit {
	id: string
	short_id?: string
	created_at?: string
	parent_ids?: string[]
	title?: string
	message?: string
	author_name?: string
	author_email?: string
	author_id?: number
	committer_name?: string
	committer_email?: string
}

export interface ListProjectCommitsParams {
	page?: number
	perPage?: number
	since?: string
	until?: string
	refName?: string
	withStats?: boolean
}

export interface GitLabContributor {
	id: string
	projectIds: number[]
	name?: string
	email?: string
	username?: string
	commitCount: number
	lastCommitAt?: string
}

export interface GitLabContributorCommit extends GitLabCommit {
	projectId: number
}

export interface FetchCommitsForContributorsOptions {
	projectIds: number[]
	contributorIds: string[]
	dateRange: { from: string; to: string }
	limitPerProject?: number
}

export interface PaginatedResult<T> {
	items: T[]
	nextPage?: number
	totalPages?: number
}

export class GitLabClient {
	private readonly baseUrl: string
	private readonly accessToken: string
	private readonly refreshToken?: string

	constructor(options: Options) {
		this.accessToken = options.accessToken
		this.refreshToken = options.refreshToken
		this.baseUrl = this.normalizeBaseUrl(options.baseUrl ?? 'https://gitlab.com/api/v4')
	}

	async getCurrentUser(): Promise<CurrentUserResponse> {
		const response = await this.fetchWithRetry(`${this.baseUrl}/user`, {
			headers: {
				Accept: 'application/json',
				Authorization: `Bearer ${this.accessToken}`
			}
		})

		if (!response.ok) {
			throw new Error('Failed to fetch GitLab profile')
		}

		return response.json() as Promise<CurrentUserResponse>
	}

	/**
	 * Generic helper to fetch all paginated entities from GitLab API.
	 * Automatically handles pagination by following the x-next-page header and collecting all results.
	 *
	 * @param fetcher - Function that fetches a single page. Should return { items, nextPage }.
	 * @returns Array of all collected items.
	 */
	async fetchAllPaginated<T>(
		fetcher: (page: number) => Promise<{ items: T[]; nextPage?: number }>
	): Promise<T[]> {
		const allItems: T[] = []
		let currentPage = 1

		while (true) {
			const result = await fetcher(currentPage)
			allItems.push(...result.items)

			if (!result.nextPage) {
				break
			}

			currentPage = result.nextPage
		}

		return allItems
	}

	/**
	 * List all projects the current user has access to (fetches all pages).
	 *
	 * @param params - Optional search and filter parameters
	 * @returns Array of all projects across all pages
	 */
	async listAllProjects(params?: Omit<ListProjectsParams, 'page'>): Promise<ProjectListItem[]> {
		return this.fetchAllPaginated(async page => this.listProjects({ ...params, page }))
	}

	/**
	 * List projects the current user has access to.
	 * Uses minimal payload and supports server-side search & pagination.
	 */
	async listProjects(params?: ListProjectsParams): Promise<PaginatedResult<ProjectListItem>> {
		const membership = params?.membership ?? true
		const withShared = params?.withShared ?? false
		const search = params?.search?.trim()

		const url = new URL(`${this.baseUrl}/projects`)

		url.searchParams.set('membership', membership ? 'true' : 'false')
		url.searchParams.set('order_by', 'last_activity_at')
		url.searchParams.set('sort', 'desc')
		url.searchParams.set('with_shared', withShared ? 'true' : 'false')
		url.searchParams.set('simple', 'true')

		if (search) {
			url.searchParams.set('search', search)
		}

		// Only add pagination params if explicitly provided
		if (params?.page !== undefined) {
			url.searchParams.set('page', params.page.toString())
		}

		if (params?.perPage !== undefined) {
			url.searchParams.set('per_page', Math.min(Math.max(params.perPage, 1), 100).toString())
		}

		const response = await this.fetchWithRetry(url.toString(), {
			headers: {
				Accept: 'application/json',
				Authorization: `Bearer ${this.accessToken}`
			}
		})

		if (!response.ok) {
			throw new Error('Failed to fetch GitLab projects')
		}

		const projects = (await response.json()) as ProjectListItem[]

		// GitLab returns pagination info in headers
		const nextPageHeader = response.headers.get('x-next-page')
		const totalPagesHeader = response.headers.get('x-total-pages')

		return {
			items: projects,
			nextPage: nextPageHeader ? Number(nextPageHeader) : undefined,
			totalPages: totalPagesHeader ? Number(totalPagesHeader) : undefined
		}
	}

	async listProjectCommits(
		projectId: number,
		params?: ListProjectCommitsParams
	): Promise<PaginatedResult<GitLabCommit>> {
		const url = new URL(
			`${this.baseUrl}/projects/${encodeURIComponent(projectId)}/repository/commits`
		)

		const perPage = Math.min(Math.max(params?.perPage ?? 100, 1), 100)
		url.searchParams.set('per_page', perPage.toString())

		if (params?.page !== undefined) {
			url.searchParams.set('page', params.page.toString())
		}

		if (params?.since) {
			url.searchParams.set('since', params.since)
		}

		if (params?.until) {
			url.searchParams.set('until', params.until)
		}

		if (params?.refName) {
			url.searchParams.set('ref_name', params.refName)
		}

		url.searchParams.set('with_stats', (params?.withStats ?? false).toString())

		const response = await this.fetchWithRetry(url.toString(), {
			headers: {
				Accept: 'application/json',
				Authorization: `Bearer ${this.accessToken}`
			}
		})

		if (!response.ok) {
			throw new Error(`Failed to fetch commits for project ${projectId}`)
		}

		const commits = (await response.json()) as GitLabCommit[]
		const nextPageHeader = response.headers.get('x-next-page')
		const totalPagesHeader = response.headers.get('x-total-pages')

		return {
			items: commits,
			nextPage: nextPageHeader ? Number(nextPageHeader) : undefined,
			totalPages: totalPagesHeader ? Number(totalPagesHeader) : undefined
		}
	}

	async listContributorsForProjects(
		projectIds: number[],
		dateRange: { from: string; to: string }
	): Promise<GitLabContributor[]> {
		if (projectIds.length === 0) {
			return []
		}

		const sinceIso = startOfDayIso(dateRange.from)
		const untilIso = endOfDayIso(dateRange.to)

		const contributorMap = new Map<string, GitLabContributor>()

		await Promise.all(
			projectIds.map(async projectId => {
				const commits = await this.fetchAllPaginated(page =>
					this.listProjectCommits(projectId, {
						page,
						since: sinceIso,
						until: untilIso,
						perPage: 100,
						withStats: false
					})
				)

				for (const commit of commits) {
					const key = createContributorKey(commit)

					const existing = contributorMap.get(key)
					const commitDate = commit.created_at

					if (existing) {
						existing.commitCount += 1
						if (commitDate && (!existing.lastCommitAt || commitDate > existing.lastCommitAt)) {
							existing.lastCommitAt = commitDate
						}
						if (!existing.projectIds.includes(projectId)) {
							existing.projectIds.push(projectId)
						}
						continue
					}

					contributorMap.set(key, {
						id: key,
						projectIds: [projectId],
						name: commit.author_name,
						email: commit.author_email,
						commitCount: 1,
						lastCommitAt: commitDate
					})
				}
			})
		)

		return Array.from(contributorMap.values())
	}

	async listCommitsForContributors({
		projectIds,
		contributorIds,
		dateRange,
		limitPerProject = 1000
	}: FetchCommitsForContributorsOptions): Promise<GitLabContributorCommit[]> {
		if (projectIds.length === 0 || contributorIds.length === 0) {
			return []
		}

		const sinceIso = startOfDayIso(dateRange.from)
		const untilIso = endOfDayIso(dateRange.to)
		const contributorSet = new Set(contributorIds)
		const commitsWithProjects: GitLabContributorCommit[] = []

		await Promise.all(
			projectIds.map(async projectId => {
				const commits = await this.fetchAllPaginated(page =>
					this.listProjectCommits(projectId, {
						page,
						since: sinceIso,
						until: untilIso,
						perPage: 100,
						withStats: false
					})
				)

				let collectedForProject = 0

				for (const commit of commits) {
					if (collectedForProject >= limitPerProject) {
						break
					}

					const key = createContributorKey(commit)
					if (!contributorSet.has(key)) {
						continue
					}

					commitsWithProjects.push({
						...commit,
						projectId
					})

					collectedForProject += 1
				}
			})
		)

		return commitsWithProjects
	}

	private async fetchWithRetry(url: string, init?: RequestInit, maxRetries = 2): Promise<Response> {
		let attempt = 0
		let lastError: unknown
		while (attempt <= maxRetries) {
			try {
				const res = await fetch(url, init)
				if (res.ok || res.status < 500) {
					return res
				}
				lastError = new Error(`HTTP ${res.status}`)
			} catch (err) {
				lastError = err
			}
			// exponential backoff: 200ms, 400ms, 800ms
			const delayMs = 200 * 2 ** attempt
			await new Promise(resolve => setTimeout(resolve, delayMs))
			attempt++
		}
		throw lastError instanceof Error ? lastError : new Error('Request failed')
	}

	private normalizeBaseUrl(url: string): string {
		if (url.endsWith('/')) {
			return url.slice(0, -1)
		}

		return url
	}
}

function startOfDayIso(date: string) {
	return new Date(`${date}T00:00:00.000Z`).toISOString()
}

function endOfDayIso(date: string) {
	return new Date(`${date}T23:59:59.999Z`).toISOString()
}

export function createContributorKey(commit: GitLabCommit): string {
	return (
		commit.author_email?.toLowerCase() ??
		(commit.author_id ? `id:${commit.author_id}` : (commit.author_name ?? commit.id))
	)
}
