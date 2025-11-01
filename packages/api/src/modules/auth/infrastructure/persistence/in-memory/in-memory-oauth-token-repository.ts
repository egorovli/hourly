import type { OAuthTokenRepository } from '../../../domain/repositories/oauth-token-repository.ts'
import type { OAuthToken } from '../../../domain/entities/oauth-token.ts'

import { injectable } from 'inversify'

@injectable()
export class InMemoryOAuthTokenRepository implements OAuthTokenRepository {
	private readonly tokens = new Map<string, OAuthToken>()

	async save(token: OAuthToken): Promise<OAuthToken> {
		this.tokens.set(token.authenticationId, token)
		return token
	}

	async findByAuthenticationId(authenticationId: string): Promise<OAuthToken | null> {
		return this.tokens.get(authenticationId) ?? null
	}

	async deleteByAuthenticationId(authenticationId: string): Promise<void> {
		this.tokens.delete(authenticationId)
	}
}
