import type { Profile, Token } from '~/lib/mikro-orm/index.ts'
import type { AtlassianClient } from '~/lib/atlassian/index.ts'

/**
 * Authentication context returned by requireAuth functions.
 * Contains the authenticated profile, token, and a pre-configured API client.
 */
export interface AuthContext {
	profile: Profile
	token: Token
	client: AtlassianClient
	isAdmin: boolean
}
