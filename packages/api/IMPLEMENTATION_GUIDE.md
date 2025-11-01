# Implementation Guide: Project Module

## Starting Point: List Projects Use Case

This guide walks through implementing the **Project module** as the first complete example, demonstrating all clean architecture layers.

## Implementation Order

### Phase 1: Domain Layer (Core Business Logic)

#### 1.1 Domain Entity
**File:** `src/modules/project/domain/entities/project.ts`

```typescript
import { DomainError } from '../../../core/base/domain-error'

export class Project {
  constructor(
    public readonly id: string,
    public readonly key: string,
    public readonly name: string
  ) {
    this.validate()
  }

  private validate(): void {
    if (!this.id || this.id.trim().length === 0) {
      throw new DomainError('Project id is required')
    }
    if (!this.key || this.key.trim().length === 0) {
      throw new DomainError('Project key is required')
    }
    if (!this.name || this.name.trim().length === 0) {
      throw new DomainError('Project name is required')
    }
  }

  equals(other: Project): boolean {
    return this.id === other.id && this.key === other.key
  }
}
```

**Why first:** This is the pure domain model - no dependencies, just business rules.

---

#### 1.2 Repository Interface
**File:** `src/modules/project/domain/repositories/project-repository.ts`

```typescript
import { Project } from '../entities/project'

export interface ProjectRepository {
  /**
   * List all projects accessible to the user
   */
  listAll(): Promise<Project[]>
  
  /**
   * List projects for a specific resource/cloud ID
   */
  listByResource(resourceId: string): Promise<Project[]>
}
```

**Why second:** Defines the contract - what the application layer needs from data access.

---

### Phase 2: Infrastructure Layer (External Dependencies)

#### 2.1 Provider Adapter
**File:** `src/modules/project/infrastructure/adapters/jira-project-adapter.ts`

```typescript
import { Project } from '../../domain/entities/project'

// Provider-specific type (from Atlassian API)
export interface JiraProjectResponse {
  id: string
  key: string
  name: string
  avatarUrls?: Record<string, string>
}

export class JiraProjectAdapter {
  toDomain(jiraProject: JiraProjectResponse): Project {
    return new Project(
      jiraProject.id,
      jiraProject.key,
      jiraProject.name
    )
  }

  toDomainList(jiraProjects: JiraProjectResponse[]): Project[] {
    return jiraProjects.map(p => this.toDomain(p))
  }
}
```

**Why third:** Isolates provider-specific models from domain models.

---

#### 2.2 Repository Implementation
**File:** `src/modules/project/infrastructure/repositories/jira-project-repository.ts`

```typescript
import { injectable } from 'inversify'
import { ProjectRepository } from '../../domain/repositories/project-repository'
import { Project } from '../../domain/entities/project'
import { JiraProjectAdapter, type JiraProjectResponse } from '../adapters/jira-project-adapter'

// TODO: Create AtlassianClient abstraction
// For now, this will use the existing client
import { AtlassianClient } from '../../../../infrastructure/providers/atlassian-client'

@injectable()
export class JiraProjectRepository implements ProjectRepository {
  constructor(
    private adapter: JiraProjectAdapter,
    private client: AtlassianClient
  ) {}

  async listAll(): Promise<Project[]> {
    const resources = await this.client.getAccessibleResources()
    const allProjects: Project[] = []

    await Promise.all(
      resources.map(async resource => {
        const { projects } = await this.client.listJiraProjects(resource.id)
        const domainProjects = this.adapter.toDomainList(projects)
        allProjects.push(...domainProjects)
      })
    )

    return allProjects
  }

  async listByResource(resourceId: string): Promise<Project[]> {
    const { projects } = await this.client.listJiraProjects(resourceId)
    return this.adapter.toDomainList(projects)
  }
}
```

**Why fourth:** Implements the repository interface using the provider-specific client.

---

### Phase 3: Application Layer (Use Cases)

#### 3.1 Command (Optional - for complex inputs)
**File:** `src/modules/project/application/commands/list-projects-command.ts`

```typescript
export interface ListProjectsCommand {
  resourceId?: string  // Optional: filter by resource
}
```

**Why fifth (optional):** For simple use cases, you can skip commands and pass parameters directly.

---

#### 3.2 Use Case
**File:** `src/modules/project/application/use-cases/list-projects-use-case.ts`

```typescript
import { injectable, inject } from 'inversify'
import { ProjectRepository } from '../../domain/repositories/project-repository'
import { Project } from '../../domain/entities/project'
import { InjectionKey } from '../../../core/ioc/injection-key.enum'
import { ListProjectsCommand } from '../commands/list-projects-command'

@injectable()
export class ListProjectsUseCase {
  constructor(
    @inject(InjectionKey.ProjectRepository)
    private projectRepository: ProjectRepository
  ) {}

  async execute(command: ListProjectsCommand = {}): Promise<Project[]> {
    if (command.resourceId) {
      return this.projectRepository.listByResource(command.resourceId)
    }
    
    return this.projectRepository.listAll()
  }
}
```

**Why sixth:** Orchestrates domain logic - this is where application-specific rules live.

---

### Phase 4: Presentation Layer (API)

#### 4.1 DTOs
**File:** `src/modules/project/presentation/dtos/project-dto.ts`

```typescript
import { Project } from '../../domain/entities/project'

export class ProjectDto {
  constructor(
    public readonly id: string,
    public readonly key: string,
    public readonly name: string
  ) {}

  static fromDomain(project: Project): ProjectDto {
    return new ProjectDto(
      project.id,
      project.key,
      project.name
    )
  }

  static fromDomainList(projects: Project[]): ProjectDto[] {
    return projects.map(p => ProjectDto.fromDomain(p))
  }
}
```

**Why seventh:** Converts domain models to API responses.

---

#### 4.2 Controller
**File:** `src/modules/project/presentation/controllers/project-controller.ts`

```typescript
import { Elysia } from 'elysia'
import { container } from '../../../core/ioc/container'
import { InjectionKey } from '../../../core/ioc/injection-key.enum'
import { ListProjectsUseCase } from '../../application/use-cases/list-projects-use-case'
import { ProjectDto } from '../dtos/project-dto'
import { ListProjectsCommand } from '../../application/commands/list-projects-command'

export const projectRoutes = new Elysia({ prefix: '/api/projects' })
  .get('/', async ({ query }) => {
    const useCase = container.get<ListProjectsUseCase>(
      InjectionKey.ListProjectsUseCase
    )
    
    const command: ListProjectsCommand = {
      resourceId: query.resourceId as string | undefined
    }
    
    const projects = await useCase.execute(command)
    
    return {
      projects: ProjectDto.fromDomainList(projects)
    }
  })
```

**Why eighth:** Exposes the use case via HTTP API.

---

### Phase 5: Dependency Injection Setup

#### 5.1 Update Injection Keys
**File:** `src/core/ioc/injection-key.enum.ts`

```typescript
export enum InjectionKey {
  // ... existing keys ...
  
  // Project module
  ProjectRepository = 'ProjectRepository',
  ListProjectsUseCase = 'ListProjectsUseCase',
}
```

---

#### 5.2 Update Container Bindings
**File:** `src/core/ioc/container.ts`

```typescript
import { Container } from 'inversify'
import { InjectionKey } from './injection-key.enum'

// Domain interfaces
import { ProjectRepository } from '../../modules/project/domain/repositories/project-repository'

// Infrastructure implementations
import { JiraProjectRepository } from '../../modules/project/infrastructure/repositories/jira-project-repository'
import { JiraProjectAdapter } from '../../modules/project/infrastructure/adapters/jira-project-adapter'

// Use cases
import { ListProjectsUseCase } from '../../modules/project/application/use-cases/list-projects-use-case'

// TODO: Create provider client abstraction
// import { AtlassianClient } from '../../infrastructure/providers/atlassian-client'

export const container = new Container()

// Bind adapter (singleton)
container.bind<JiraProjectAdapter>(InjectionKey.JiraProjectAdapter)
  .to(JiraProjectAdapter)
  .inSingletonScope()

// Bind repository (interface to implementation)
container.bind<ProjectRepository>(InjectionKey.ProjectRepository)
  .to(JiraProjectRepository)
  .inSingletonScope()

// Bind use case
container.bind<ListProjectsUseCase>(InjectionKey.ListProjectsUseCase)
  .to(ListProjectsUseCase)
```

---

#### 5.3 Register Routes
**File:** `src/infrastructure/http/index.ts`

```typescript
import { Elysia } from 'elysia'
import { projectRoutes } from '../../modules/project/presentation/controllers/project-controller'

export const app = new Elysia()
  .use(projectRoutes)
  .get('/', 'Hello Elysia')
```

---

## Testing Strategy

1. **Domain Entity Tests** - Test validation and business rules
2. **Adapter Tests** - Test provider → domain mapping
3. **Repository Tests** - Mock client, test repository logic
4. **Use Case Tests** - Mock repository, test orchestration
5. **Controller Tests** - Integration tests with test container

## Next Steps After Project Module

Once Project module is complete and working:
1. **Contributor Module** - Similar structure, slightly more complex
2. **Issue Module** - Depends on Project
3. **Commit Module** - Depends on Contributor
4. **Worklog Module** - Depends on Issue, Project, Contributor
5. **Reconciliation Module** - Depends on all above

## Notes

- **AtlassianClient Abstraction**: You'll need to create an abstraction for the Atlassian client to inject it properly. Consider creating `src/infrastructure/providers/atlassian-client.ts` that wraps the existing client.
- **Authentication**: You'll need to handle OAuth tokens. Consider creating a middleware or context that provides authenticated clients.
- **Error Handling**: Add proper error handling at each layer (domain errors, infrastructure errors, validation errors).


