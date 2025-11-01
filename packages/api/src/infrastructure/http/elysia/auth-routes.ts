import type { AuthController } from '../../../modules/auth/presentation/controllers/auth-controller.ts'
import type {
	RegisterUserProfileCommand,
	LinkAuthenticationCommand,
	StoreOAuthTokenCommand,
	GenerateOAuthAuthorizationRequestCommand,
	ValidateOAuthStateCommand
} from '../../../modules/auth/application/commands/index.ts'
import type { ProviderType } from '../../../modules/auth/domain/value-objects/provider-type.ts'

import type { Elysia } from 'elysia'

interface RegisterUserProfilePayload {
	id: string
	providerType: ProviderType
	provider: string
	accountId: string
	displayName?: string
	email?: string
	username?: string
	avatarUrl?: string
	providerMetadata?: Record<string, unknown>
	createdAt: string
	updatedAt: string
}

interface LinkAuthenticationPayload {
	id: string
	profileId: string
	providerType: ProviderType
	scopes: string[]
	grantedAt: string
	expiresAt?: string
}

interface StoreOAuthTokenPayload {
	authenticationId: string
	accessToken: string
	refreshToken?: string
	expiresAt?: string
	tokenType: string
	updatedAt: string
}

interface GenerateOAuthAuthorizationRequestPayload {
	providerType: ProviderType
	redirectUri: string
	scopes: string[]
	expiresInSeconds?: number
}

interface ValidateOAuthStatePayload {
	state: string
}

/**
 * Maps HTTP requests to the driver-agnostic auth controller.
 * The resulting configuration can be replaced with other transports (CLI, gRPC, etc.)
 * without affecting the underlying use cases or controllers.
 */
export function registerAuthRoutes(app: Elysia, controller: AuthController): Elysia {
	return app
		.post('/auth/profiles', async ({ body, set }) => {
			try {
				const payload = body as RegisterUserProfilePayload
				const command: RegisterUserProfileCommand = {
					id: payload.id,
					providerType: payload.providerType,
					provider: payload.provider,
					accountId: payload.accountId,
					displayName: payload.displayName,
					email: payload.email,
					username: payload.username,
					avatarUrl: payload.avatarUrl,
					providerMetadata: payload.providerMetadata,
					createdAt: new Date(payload.createdAt),
					updatedAt: new Date(payload.updatedAt)
				}

				return await controller.registerUserProfile(command)
			} catch (error) {
				set.status = 400
				return toErrorResponse(error)
			}
		})
		.post('/auth/authentications', async ({ body, set }) => {
			try {
				const payload = body as LinkAuthenticationPayload
				const command: LinkAuthenticationCommand = {
					id: payload.id,
					profileId: payload.profileId,
					providerType: payload.providerType,
					scopes: payload.scopes,
					grantedAt: payload.grantedAt,
					expiresAt: payload.expiresAt
				}

				return await controller.linkAuthentication(command)
			} catch (error) {
				set.status = 400
				return toErrorResponse(error)
			}
		})
		.post('/auth/tokens', async ({ body, set }) => {
			try {
				const payload = body as StoreOAuthTokenPayload
				const command: StoreOAuthTokenCommand = {
					authenticationId: payload.authenticationId,
					accessToken: payload.accessToken,
					refreshToken: payload.refreshToken,
					expiresAt: payload.expiresAt,
					tokenType: payload.tokenType,
					updatedAt: payload.updatedAt
				}

				return await controller.storeOAuthToken(command)
			} catch (error) {
				set.status = 400
				return toErrorResponse(error)
			}
		})
		.post('/auth/oauth/state', async ({ body, set }) => {
			try {
				const payload = body as GenerateOAuthAuthorizationRequestPayload
				const command: GenerateOAuthAuthorizationRequestCommand = {
					providerType: payload.providerType,
					redirectUri: payload.redirectUri,
					scopes: payload.scopes,
					expiresInSeconds: payload.expiresInSeconds
				}

				return await controller.generateOAuthAuthorizationRequest(command)
			} catch (error) {
				set.status = 400
				return toErrorResponse(error)
			}
		})
		.post('/auth/oauth/state/validate', async ({ body, set }) => {
			try {
				const payload = body as ValidateOAuthStatePayload
				const command: ValidateOAuthStateCommand = {
					state: payload.state
				}

				return await controller.validateOAuthState(command)
			} catch (error) {
				set.status = 400
				return toErrorResponse(error)
			}
		})
}

function toErrorResponse(error: unknown): { error: string } {
	if (error instanceof Error) {
		return { error: error.message }
	}

	return { error: 'Unknown error' }
}
