// import type { MeResponse } from '../atlassian/client.ts'
// import type { StrategyVerifyCallback } from 'remix-auth'
// import type {
// 	OAuth2Profile,
// 	OAuth2StrategyOptions,
// 	OAuth2StrategyVerifyParams,
// 	TokenResponseBody
// } from 'remix-auth-oauth2'

// import { OAuth2Strategy } from 'remix-auth-oauth2'

// import { AtlassianClient } from '../atlassian/client.ts'

// interface AtlassianStrategyOptions extends OAuth2StrategyOptions {}

// type AtlassianProfile = OAuth2Profile &
// 	Omit<MeResponse, 'name'> & {
// 		provider: 'atlassian'
// 		full_name?: string
// 	}

// interface AtlassianExtraParams extends Record<string, unknown> {
// 	id_token: string
// }

// export class AtlassianStrategy<User> extends OAuth2Strategy<User> {
// 	override name = 'atlassian'

// 	private readonly audience = 'api.atlassian.com'

// 	// eslint-disable-next-line @typescript-eslint/no-useless-constructor
// 	// constructor(
// 	// 	options: AtlassianStrategyOptions,
// 	// 	verify: StrategyVerifyCallback<
// 	// 		User,
// 	// 		OAuth2StrategyVerifyParams<AtlassianProfile, AtlassianExtraParams>
// 	// 	>
// 	// ) {
// 	// 	super(options, verify)
// 	// }

// 	protected override authorizationParams(params: URLSearchParams): URLSearchParams {
// 		params.set('audience', this.audience)
// 		params.set('prompt', 'consent')

// 		return params
// 	}

// 	protected override async userProfile(
// 		tokens: TokenResponseBody & AtlassianExtraParams
// 	): Promise<AtlassianProfile> {
// 		let client = new AtlassianClient({ accessToken: tokens.access_token })
// 		let profile = await client.getMe()

// 		return {
// 			provider: 'atlassian',
// 			...profile,
// 			full_name: profile.name,
// 			name: undefined
// 		}
// 	}
// }
