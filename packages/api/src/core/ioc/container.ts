import type { AuthenticationRepository } from '../../modules/auth/domain/repositories/authentication-repository.ts'
import type { OAuthTokenRepository } from '../../modules/auth/domain/repositories/oauth-token-repository.ts'
import type { UserProfileRepository } from '../../modules/auth/domain/repositories/user-profile-repository.ts'
import type { OAuthStateService } from '../../modules/auth/domain/services/oauth-state-service.ts'
import type { UserProfileValidator } from '../../modules/auth/domain/services/user-profile-validator.ts'
import type { IdGenerator } from '../services/id-generator.ts'

import { Container } from 'inversify'

import { InjectionKey } from './injection-key.enum.ts'

import { ListProjectsUseCase } from '../../modules/project/application/use-cases/list-projects-use-case.ts'
import { ZodUserProfileValidator } from '../../modules/auth/infrastructure/validators/zod-user-profile-validator.ts'
import { UserProfileFactory } from '../../modules/auth/domain/factories/user-profile-factory.ts'
import { RegisterUserProfileUseCase } from '../../modules/auth/application/use-cases/register-user-profile-use-case.ts'
import { LinkAuthenticationUseCase } from '../../modules/auth/application/use-cases/link-authentication-use-case.ts'
import { StoreOAuthTokenUseCase } from '../../modules/auth/application/use-cases/store-oauth-token-use-case.ts'
import { GenerateOAuthAuthorizationRequestUseCase } from '../../modules/auth/application/use-cases/generate-oauth-authorization-request-use-case.ts'
import { ValidateOAuthStateUseCase } from '../../modules/auth/application/use-cases/validate-oauth-state-use-case.ts'
import { AuthController } from '../../modules/auth/presentation/controllers/auth-controller.ts'
import { InMemoryUserProfileRepository } from '../../modules/auth/infrastructure/persistence/in-memory/in-memory-user-profile-repository.ts'
import { InMemoryAuthenticationRepository } from '../../modules/auth/infrastructure/persistence/in-memory/in-memory-authentication-repository.ts'
import { InMemoryOAuthTokenRepository } from '../../modules/auth/infrastructure/persistence/in-memory/in-memory-oauth-token-repository.ts'
import { InMemoryOAuthStateService } from '../../modules/auth/infrastructure/services/in-memory-oauth-state-service.ts'
import { BunUuidV7Generator } from '../../infrastructure/ids/bun-uuid-v7-generator.ts'

// Infrastructure implementations will be bound here when implemented
// import { JiraProjectRepository } from '../modules/project/infrastructure/repositories/jira-project-repository'

export const container = new Container()

// Project module bindings
// Note: Repository binding will be configured when infrastructure implementation is added
// container.bind<ProjectRepository>(InjectionKey.ProjectRepository)
//   .to(JiraProjectRepository)
//   .inSingletonScope()

container.bind<ListProjectsUseCase>(InjectionKey.ListProjectsUseCase).to(ListProjectsUseCase)

// Auth module bindings
container.bind<IdGenerator>(InjectionKey.IdGenerator).to(BunUuidV7Generator).inSingletonScope()

container
	.bind<UserProfileRepository>(InjectionKey.UserProfileRepository)
	.to(InMemoryUserProfileRepository)
	.inSingletonScope()

container
	.bind<AuthenticationRepository>(InjectionKey.AuthenticationRepository)
	.to(InMemoryAuthenticationRepository)
	.inSingletonScope()

container
	.bind<OAuthTokenRepository>(InjectionKey.OAuthTokenRepository)
	.to(InMemoryOAuthTokenRepository)
	.inSingletonScope()

container
	.bind<OAuthStateService>(InjectionKey.OAuthStateService)
	.to(InMemoryOAuthStateService)
	.inSingletonScope()

container
	.bind<UserProfileValidator>(InjectionKey.UserProfileValidator)
	.to(ZodUserProfileValidator)
	.inSingletonScope()

container
	.bind<UserProfileFactory>(InjectionKey.UserProfileFactory)
	.to(UserProfileFactory)
	.inSingletonScope()

container
	.bind<RegisterUserProfileUseCase>(InjectionKey.RegisterUserProfileUseCase)
	.to(RegisterUserProfileUseCase)
	.inSingletonScope()

container
	.bind<LinkAuthenticationUseCase>(InjectionKey.LinkAuthenticationUseCase)
	.to(LinkAuthenticationUseCase)
	.inSingletonScope()

container
	.bind<StoreOAuthTokenUseCase>(InjectionKey.StoreOAuthTokenUseCase)
	.to(StoreOAuthTokenUseCase)
	.inSingletonScope()

container
	.bind<GenerateOAuthAuthorizationRequestUseCase>(
		InjectionKey.GenerateOAuthAuthorizationRequestUseCase
	)
	.to(GenerateOAuthAuthorizationRequestUseCase)
	.inSingletonScope()

container
	.bind<ValidateOAuthStateUseCase>(InjectionKey.ValidateOAuthStateUseCase)
	.to(ValidateOAuthStateUseCase)
	.inSingletonScope()

container.bind<AuthController>(InjectionKey.AuthController).to(AuthController).inSingletonScope()
