/** biome-ignore-all lint/style/noProcessEnv: We need to access env variables */

export interface GitLabClientOptions {
	accessToken: string
	refreshToken?: string
	baseUrl?: string
	userAgent?: string
}

export interface GitLabClientBaseRequestOptions {
	signal?: AbortSignal
	headers?: HeadersInit
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

export class GitLabClient {
	private readonly baseUrl: string = 'https://gitlab.com/api/v4'
	private readonly userAgent: string = `egorovli/hourly@${process.env.VERSION ?? 'unknown'}`

	private readonly accessToken: string
	private readonly refreshToken?: string

	constructor(options: GitLabClientOptions) {
		this.baseUrl = options.baseUrl ?? this.baseUrl
		this.userAgent = options.userAgent ?? this.userAgent
		this.accessToken = options.accessToken
		this.refreshToken = options.refreshToken
	}

	async getCurrentUser(options?: GitLabClientBaseRequestOptions): Promise<CurrentUserResponse> {
		const response = await fetch(`${this.baseUrl}/user`, {
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
			throw new Error(`Failed to fetch GitLab profile: ${response.statusText}`)
		}

		return response.json() as Promise<CurrentUserResponse>
	}
}
