import type { OAuthStateService } from '../../domain/services/oauth-state-service.ts'
import type { ProviderType } from '../../domain/value-objects/provider-type.ts'
import type { OAuthAuthorizationRequest as OAuthAuthorizationRequestType } from '../../domain/value-objects/oauth-authorization-request.ts'

import { inject, injectable } from 'inversify'

import { OAuthAuthorizationRequest } from '../../domain/value-objects/oauth-authorization-request.ts'
import { InjectionKey } from '../../../../core/ioc/injection-key.enum.ts'
import type { IdGenerator } from '../../../../core/services/id-generator.ts'

@injectable()
export class InMemoryOAuthStateService implements OAuthStateService {
	private readonly requests = new Map<string, OAuthAuthorizationRequestType>()

	constructor(
		@inject(InjectionKey.IdGenerator)
		private readonly idGenerator: IdGenerator
	) {}

	async generateAuthorizationRequest(
		providerType: ProviderType,
		redirectUri: string,
		scopes: string[],
		expiresInSeconds = 900
	): Promise<OAuthAuthorizationRequestType> {
		const state = this.idGenerator.generate()
		const createdAt = new Date()
		const expiresAt = new Date(createdAt.getTime() + expiresInSeconds * 1000)

		const request = new OAuthAuthorizationRequest({
			state,
			providerType,
			redirectUri,
			scopes,
			createdAt: createdAt.toISOString(),
			expiresAt: expiresAt.toISOString()
		})

		this.requests.set(state, request)

		return request
	}

	async validateAndConsume(state: string): Promise<OAuthAuthorizationRequestType> {
		const request = this.requests.get(state)

		if (!request) {
			throw new Error('Invalid OAuth state token')
		}

		if (request.isExpired()) {
			this.requests.delete(state)
			throw new Error('OAuth state token has expired')
		}

		this.requests.delete(state)
		return request
	}

	async isValid(state: string): Promise<boolean> {
		const request = this.requests.get(state)
		if (!request) {
			return false
		}

		if (request.isExpired()) {
			this.requests.delete(state)
			return false
		}

		return true
	}
}
