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
	 * List projects the current user has access to.
	 * Uses minimal payload and supports server-side search & pagination.
	 */
	async listProjects(params?: {
		search?: string
		page?: number
		perPage?: number
		membership?: boolean
		withShared?: boolean
	}): Promise<{
		projects: ProjectListItem[]
		nextPage?: number
		totalPages?: number
	}> {
		const page = params?.page ?? 1
		const perPage = Math.min(Math.max(params?.perPage ?? 30, 1), 100)
		const membership = params?.membership ?? true
		const withShared = params?.withShared ?? false
		const search = params?.search?.trim()

		const url = new URL(`${this.baseUrl}/projects`)
		url.searchParams.set('membership', String(membership))
		url.searchParams.set('simple', 'true')
		url.searchParams.set('order_by', 'last_activity_at')
		url.searchParams.set('sort', 'desc')
		url.searchParams.set('per_page', String(perPage))
		url.searchParams.set('page', String(page))
		url.searchParams.set('with_shared', String(withShared))
		if (search) {
			url.searchParams.set('search', search)
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

		const nextPageHeader = response.headers.get('x-next-page')
		const totalPagesHeader = response.headers.get('x-total-pages')

		return {
			projects,
			nextPage: nextPageHeader ? Number(nextPageHeader) : undefined,
			totalPages: totalPagesHeader ? Number(totalPagesHeader) : undefined
		}
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
