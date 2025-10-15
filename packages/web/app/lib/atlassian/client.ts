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
}
