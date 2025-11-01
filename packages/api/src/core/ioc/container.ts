import type { UserProfileValidator } from '../../modules/auth/domain/services/user-profile-validator.ts'

import { Container } from 'inversify'

import { InjectionKey } from './injection-key.enum.ts'

import { ListProjectsUseCase } from '../../modules/project/application/use-cases/list-projects-use-case.ts'
import { ZodUserProfileValidator } from '../../modules/auth/infrastructure/validators/zod-user-profile-validator.ts'
import { UserProfileFactory } from '../../modules/auth/domain/factories/user-profile-factory.ts'

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
container.bind<UserProfileValidator>(InjectionKey.UserProfileValidator)
	.to(ZodUserProfileValidator)
	.inSingletonScope()

container.bind<UserProfileFactory>(InjectionKey.UserProfileFactory)
	.to(UserProfileFactory)
	.inSingletonScope()
