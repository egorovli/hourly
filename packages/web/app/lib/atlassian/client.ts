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
}
