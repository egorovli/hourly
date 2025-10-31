# API Architecture Analysis: Domain-Driven Clean Architecture

## Executive Summary

This document analyzes the domain models and proposes a **domain-driven clean architecture** structure for the new Bun + Elysia API implementation using InversifyJS. The architecture abstracts away provider-specific implementations (Jira, GitLab) and focuses on core business domain concepts.

## Core Domain Model Analysis

### Domain Entities (Provider-Agnostic)

#### 1. **WorklogEntry** - Core Time Tracking Entity

**Properties:**
- `id: string` - External system ID
- `issueId: string` - Reference to Issue entity (by issue key)
- `summary: string` - Worklog description/comment
- `projectId: string` - Reference to Project entity
- `authorId: string` - Reference to Contributor/Author entity (account identifier)
- `startedAt: string` - ISO 8601 datetime when work started
- `timeSpentSeconds: number` - Duration in seconds

**Business Rules (Invariants):**
- `timeSpentSeconds` must be a positive integer
- `startedAt` must be a valid ISO 8601 datetime string
- `issueId` must reference an existing issue
- `projectId` must reference an existing project
- `authorId` must reference an existing contributor
- `summary` must be non-empty string
- Worklog entries must be associated with an existing issue

**Domain Services:**
- `WorklogEntryValidator` - Validates worklog entry invariants
- `WorklogEntryFactory` - Creates valid worklog entries

#### 2. **Issue** - Task/Ticket Entity

**Properties:**
- `id: string` - External system ID
- `key: string` - Issue key (e.g., "PROJ-123")
- `summary: string` - Issue title/summary
- `projectId: string` - Reference to Project entity
- `status?: string` - Issue status
- `assigneeId?: string` - Reference to Contributor entity (optional)
- `updatedAt?: string` - Last update timestamp (ISO 8601)
- `createdAt?: string` - Creation timestamp (ISO 8601)

**Business Rules:**
- `key` must follow pattern `[A-Z][A-Z0-9]+-\d+`
- `summary` must be non-empty
- `projectId` must reference an existing project

#### 3. **Project** - Project Container Entity

**Properties:**
- `id: string` - External system ID
- `key: string` - Project key (e.g., "PROJ")
- `name: string` - Project display name

**Business Rules:**
- `key` must be non-empty
- `name` must be non-empty

#### 4. **Commit** - Code Commit Entity

**Properties:**
- `id: string` - Commit hash/ID
- `shortId: string` - Short commit ID
- `title: string` - Commit title
- `message: string` - Full commit message
- `authorId: string` - Reference to Contributor entity
- `createdAt: string` - ISO 8601 datetime
- `projectId: string` - Reference to Project entity
- `issueKeys: string[]` - Extracted issue keys from message (references to Issue entities)

**Business Rules:**
- `id` must be non-empty
- `createdAt` must be valid ISO 8601 datetime
- `authorId` must reference an existing contributor
- `projectId` must reference an existing project
- `issueKeys` are extracted from title/message using pattern `[A-Z][A-Z0-9]+-\d+`

**Domain Services:**
- `IssueKeyExtractor` - Extracts issue keys from commit messages

#### 5. **Contributor** - Person Entity

**Properties:**
- `id: string` - Contributor identifier
- `accountId: string` - Account identifier (may differ from id, used for cross-system matching)
- `name?: string` - Display name
- `email?: string` - Email address
- `username?: string` - Username

**Business Rules:**
- At least one identifier (`id`, `accountId`, `email`, or `username`) must be present
- `accountId` is used for cross-system matching (e.g., matching GitLab contributor to Jira author)

#### 6. **ReconciliationPreferences** - User Preferences

**Properties:**
- `workingDayStartTime: string` - Start time (HH:mm format, default: "09:00")
- `workingDayEndTime: string` - End time (HH:mm format, default: "18:00")
- `minimumDurationMinutes: number` - Minimum worklog duration (default: 60)
- `timezone: string` - Timezone (default: "UTC")

**Business Rules:**
- `workingDayStartTime` must be before `workingDayEndTime`
- `minimumDurationMinutes` must be positive
- Time format must be valid HH:mm

#### 7. **WorklogChanges** - Change Tracking Aggregate (Application Layer)

**Note:** This is an application-layer concept for comparing sets of worklogs, not a domain entity. It uses worklog `id` for comparison.

**Properties:**
- `newEntries: WorklogEntry[]` - Entries that exist only in the new set
- `modifiedEntries: WorklogEntry[]` - Entries that exist in both sets but differ
- `deletedEntries: WorklogEntry[]` - Entries that exist only in the old set
- `hasChanges: boolean` - Whether any changes exist
- `changeCount: number` - Total number of changes

**Business Rules:**
- `changeCount` = `newEntries.length + modifiedEntries.length + deletedEntries.length`
- `hasChanges` = `changeCount > 0`
- Comparison uses `id` field when available, otherwise compares by `issueId`, `startedAt`, and `timeSpentSeconds`

### Domain Value Objects

#### **DateRange**
- `from: string` - ISO date (YYYY-MM-DD)
- `to: string` - ISO date (YYYY-MM-DD)
- **Invariant:** `from <= to`

#### **Pagination**
- `page: number` - Page number (min: 1)
- `size: number` - Page size (min: 1, max: 100)
- `offset: number` - Calculated offset

### Entity Relationships

Entities reference each other by ID only. The domain layer maintains normalized entities:

- **WorklogEntry** references: `issueId`, `projectId`, `authorId`
- **Issue** references: `projectId`, `assigneeId?`
- **Commit** references: `projectId`, `authorId`
- **Project** has no references (root entity)
- **Contributor** has no references (root entity)

**Note:** When displaying entities (e.g., in DTOs or presentation layer), repositories or use cases should resolve references by loading related entities. The domain layer itself keeps entities normalized and references only by ID.

## Domain-Driven Architecture Structure

### Module Organization by Domain Concepts

```
src/
├── core/                          # Framework abstractions
│   ├── base/                      # Base classes (DomainError, etc.)
│   ├── errors/                    # Domain error types
│   ├── ioc/                       # Dependency injection container
│   └── http/                      # HTTP abstractions (Elysia setup)
│
├── modules/                       # Domain modules (not provider modules!)
│   │
│   ├── worklog/                   # Worklog domain module
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── worklog-entry.ts
│   │   │   ├── services/
│   │   │   │   ├── worklog-comparison-service.ts
│   │   │   │   └── worklog-entry-validator.ts
│   │   │   └── repositories/
│   │   │       └── worklog-repository.ts           # Provider-agnostic interface
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── fetch-worklog-entries-use-case.ts
│   │   │   │   ├── sync-worklog-entries-use-case.ts   # Idempotent sync
│   │   │   │   └── compare-worklog-entries-use-case.ts
│   │   │   ├── commands/
│   │   │   │   └── sync-worklog-entries-command.ts
│   │   │   └── value-objects/
│   │   │       └── worklog-changes.ts              # Application-layer value object for change tracking
│   │   ├── infrastructure/
│   │   │   ├── repositories/
│   │   │   │   ├── jira-worklog-repository.ts        # Jira implementation
│   │   │   │   └── gitlab-worklog-repository.ts       # Future: GitLab implementation
│   │   │   └── adapters/
│   │   │       └── worklog-adapter.ts                # Maps provider models to domain
│   │   └── presentation/
│   │       ├── controllers/
│   │       │   └── worklog-controller.ts
│   │       └── dtos/
│   │           ├── worklog-request-dto.ts
│   │           └── worklog-response-dto.ts
│   │
│   ├── issue/                     # Issue domain module
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── issue.ts
│   │   │   └── repositories/
│   │   │       └── issue-repository.ts              # Provider-agnostic interface
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── search-issues-use-case.ts
│   │   │   │   ├── fetch-issues-by-keys-use-case.ts
│   │   │   │   └── fetch-touched-issues-use-case.ts
│   │   │   └── commands/
│   │   │       └── search-issues-command.ts
│   │   ├── infrastructure/
│   │   │   ├── repositories/
│   │   │   │   └── jira-issue-repository.ts          # Jira implementation
│   │   │   └── adapters/
│   │   │       └── issue-adapter.ts                  # Maps provider models to domain
│   │   └── presentation/
│   │       ├── controllers/
│   │       │   └── issue-controller.ts
│   │       └── dtos/
│   │           └── issue-dto.ts
│   │
│   ├── project/                   # Project domain module
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── project.ts
│   │   │   └── repositories/
│   │   │       └── project-repository.ts           # Provider-agnostic interface
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   └── list-projects-use-case.ts
│   │   │   └── commands/
│   │   │       └── list-projects-command.ts
│   │   ├── infrastructure/
│   │   │   ├── repositories/
│   │   │   │   ├── jira-project-repository.ts         # Jira implementation
│   │   │   │   └── gitlab-project-repository.ts     # GitLab implementation
│   │   │   └── adapters/
│   │   │       ├── jira-project-adapter.ts
│   │   │       └── gitlab-project-adapter.ts
│   │   └── presentation/
│   │       ├── controllers/
│   │       │   └── project-controller.ts
│   │       └── dtos/
│   │           └── project-dto.ts
│   │
│   ├── commit/                    # Commit domain module
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── commit.ts
│   │   │   ├── services/
│   │   │   │   └── issue-key-extractor.ts            # Domain service
│   │   │   └── repositories/
│   │   │       └── commit-repository.ts            # Provider-agnostic interface
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── fetch-commits-for-contributors-use-case.ts
│   │   │   │   └── extract-issue-keys-from-commits-use-case.ts
│   │   │   └── commands/
│   │   │       └── fetch-commits-command.ts
│   │   ├── infrastructure/
│   │   │   ├── repositories/
│   │   │   │   └── gitlab-commit-repository.ts       # GitLab implementation
│   │   │   └── adapters/
│   │   │       └── commit-adapter.ts                 # Maps provider models to domain
│   │   └── presentation/
│   │       ├── controllers/
│   │       │   └── commit-controller.ts
│   │       └── dtos/
│   │           └── commit-dto.ts
│   │
│   ├── contributor/               # Contributor domain module
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── contributor.ts
│   │   │   └── repositories/
│   │   │       └── contributor-repository.ts      # Provider-agnostic interface
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   └── list-contributors-use-case.ts
│   │   │   └── commands/
│   │   │       └── list-contributors-command.ts
│   │   ├── infrastructure/
│   │   │   ├── repositories/
│   │   │   │   ├── jira-contributor-repository.ts    # Jira implementation
│   │   │   │   └── gitlab-contributor-repository.ts  # GitLab implementation
│   │   │   └── adapters/
│   │   │       ├── jira-contributor-adapter.ts
│   │   │       └── gitlab-contributor-adapter.ts
│   │   └── presentation/
│   │       ├── controllers/
│   │       │   └── contributor-controller.ts
│   │       └── dtos/
│   │           └── contributor-dto.ts
│   │
│   └── reconciliation/            # Reconciliation domain module
│       ├── domain/
│       │   ├── entities/
│       │   │   └── reconciliation-preferences.ts
│       │   ├── services/
│       │   │   └── worklog-calculation-service.ts     # Core algorithm interface
│       │   └── value-objects/
│       │       └── reconciliation-result.ts
│       ├── application/
│       │   ├── use-cases/
│       │   │   └── calculate-worklogs-from-commits-use-case.ts
│       │   └── commands/
│       │       └── calculate-worklogs-command.ts
│       ├── infrastructure/
│       │   └── services/
│       │       └── worklog-calculation-service-impl.ts     # Implementation of algorithm
│       └── presentation/
│           ├── controllers/
│           │   └── reconciliation-controller.ts
│           └── dtos/
│               └── reconciliation-dto.ts
│
└── infrastructure/                # Cross-cutting infrastructure
    ├── providers/                 # Provider implementations (Jira, GitLab)
    │   ├── jira/
    │   │   ├── jira-api-client.ts
    │   │   └── jira-mappers.ts
    │   └── gitlab/
    │       ├── gitlab-api-client.ts
    │       └── gitlab-mappers.ts
    ├── database/                   # Database infrastructure
    │   └── MikroORM setup
    └── auth/                       # Authentication infrastructure
        └── OAuth providers
```

## Key Design Principles

### 1. Provider Abstraction

**Domain Layer** defines interfaces, **Infrastructure Layer** provides implementations:

```typescript
// modules/worklog/domain/repositories/worklog-repository.ts
export interface WorklogRepository {
  findByDateRange(
    dateRange: DateRange,
    projectIds?: string[],
    userIds?: string[]
  ): Promise<WorklogEntry[]>
  
  create(entry: WorklogEntry): Promise<WorklogEntry>
  delete(id: string): Promise<void>
}

// modules/worklog/infrastructure/repositories/jira-worklog-repository.ts
export class JiraWorklogRepository implements WorklogRepository {
  constructor(
    private jiraClient: JiraApiClient,
    private adapter: WorklogAdapter
  ) {}
  
  async findByDateRange(...): Promise<WorklogEntry[]> {
    const jiraWorklogs = await this.jiraClient.fetchWorklogs(...)
    return jiraWorklogs.map(w => this.adapter.toDomain(w))
  }
}
```

### 2. Adapter Pattern for Provider Models

Convert provider-specific models to domain entities:

```typescript
// modules/worklog/infrastructure/adapters/worklog-adapter.ts
export class WorklogAdapter {
  toDomain(jiraWorklog: JiraWorklogResponse, issue: Issue, project: Project, author: Contributor): WorklogEntry {
    return {
      id: jiraWorklog.id,
      issueId: issue.key,
      summary: this.extractSummary(jiraWorklog.comment),
      projectId: project.id,
      authorId: author.accountId,
      startedAt: jiraWorklog.started,
      timeSpentSeconds: jiraWorklog.timeSpentSeconds,
    }
  }
  
  toProvider(domain: WorklogEntry): JiraWorklogRequest {
    return {
      started: this.convertToJiraDateTime(domain.startedAt),
      timeSpentSeconds: domain.timeSpentSeconds,
      comment: this.createJiraComment(domain.summary),
    }
  }
}
```

### 3. Domain Services for Business Logic

Core algorithms live in domain services:

```typescript
// modules/reconciliation/domain/services/worklog-calculation-service.ts
export interface WorklogCalculationService {
  calculate(
    commits: Commit[],
    issues: Map<string, Issue>,
    preferences: ReconciliationPreferences,
    authorId: string  // Contributor ID
  ): WorklogEntry[]
}

// modules/reconciliation/infrastructure/services/worklog-calculation-service-impl.ts
export class WorklogCalculationServiceImpl implements WorklogCalculationService {
  calculate(...): WorklogEntry[] {
    // Groups commits by day and issue
    // Splits workday across issues
    // Respects minimum duration constraints
    // Returns domain WorklogEntry[] (not provider-specific)
  }
}
```

### 4. Use Cases Orchestrate Domain Logic

Use cases coordinate between repositories and domain services:

```typescript
// modules/worklog/application/use-cases/sync-worklog-entries-use-case.ts
export class SyncWorklogEntriesUseCase {
  constructor(
    private worklogRepository: WorklogRepository,
    private issueRepository: IssueRepository
  ) {}
  
  async execute(command: SyncWorklogEntriesCommand): Promise<SyncResult> {
    // 1. Fetch existing worklogs (via repository interface)
    const existing = await this.worklogRepository.findByDateRange(
      command.dateRange,
      command.projectIds,
      [command.userId]
    )
    
    // 2. Delete all existing (idempotent strategy)
    for (const entry of existing) {
      if (entry.id) {
        await this.worklogRepository.delete(entry.id)
      }
    }
    
    // 3. Create new worklogs
    for (const entry of command.entries) {
      await this.worklogRepository.create(entry)
    }
    
    return { success: true, updatedCount: command.entries.length }
  }
}
```

## Domain Module Examples

### Worklog Module Structure

```typescript
// modules/worklog/domain/entities/worklog-entry.ts
export class WorklogEntry {
  constructor(
    public readonly id: string,
    public readonly issueId: string,
    public readonly summary: string,
    public readonly projectId: string,
    public readonly authorId: string,
    public readonly startedAt: string,
    public readonly timeSpentSeconds: number
  ) {
    this.validate()
  }
  
  private validate(): void {
    if (this.timeSpentSeconds <= 0) {
      throw new ValidationError('timeSpentSeconds must be positive')
    }
    if (!this.isValidIsoDatetime(this.startedAt)) {
      throw new ValidationError('startedAt must be valid ISO 8601 datetime')
    }
    if (!this.issueId) {
      throw new ValidationError('issueId is required')
    }
    if (!this.projectId) {
      throw new ValidationError('projectId is required')
    }
    if (!this.authorId) {
      throw new ValidationError('authorId is required')
    }
    if (!this.id) {
      throw new ValidationError('id is required')
    }
  }
  
  // Domain methods...
  equals(other: WorklogEntry): boolean {
    return this.id === other.id &&
           this.issueId === other.issueId &&
           this.startedAt === other.startedAt &&
           this.timeSpentSeconds === other.timeSpentSeconds
  }
}
```

### Reconciliation Module Structure

```typescript
// modules/reconciliation/domain/services/worklog-calculation-service.ts
export interface WorklogCalculationService {
  calculate(
    commits: Commit[],
    issues: Map<string, Issue>,
    preferences: ReconciliationPreferences,
    authorId: string  // Contributor ID
  ): WorklogEntry[]
}

// modules/reconciliation/infrastructure/services/worklog-calculation-service-impl.ts
export class WorklogCalculationServiceImpl implements WorklogCalculationService {
  calculate(
    commits: Commit[],
    issues: Map<string, Issue>,
    preferences: ReconciliationPreferences,
    authorId: string
  ): WorklogEntry[] {
    // 1. Group commits by day (in user's timezone)
    const commitsByDay = this.groupByDay(commits, preferences.timezone)
    
    // 2. For each day, group by issue
    // 3. Split workday across issues respecting minimum duration
    // 4. Return domain WorklogEntry[] with references (not provider-specific)
    // Each WorklogEntry will have: issueId, projectId (from issue), authorId, startedAt
  }
  
  private groupByDay(commits: Commit[], timezone: string): Map<string, Commit[]> {
    // Domain logic: timezone-aware grouping
  }
  
  private splitWorkday(
    issues: Issue[],
    preferences: ReconciliationPreferences,
    authorId: string
  ): WorklogEntry[] {
    // Domain logic: workday splitting algorithm
    // Returns WorklogEntry[] with issueId, projectId, authorId, startedAt references
  }
}
```

## InversifyJS Configuration

### Provider-Agnostic Bindings

```typescript
// core/ioc/container.ts
import { Container } from 'inversify'
import { InjectionKey } from './injection-key.enum'

// Domain interfaces (provider-agnostic)
import { WorklogRepository } from '../../modules/worklog/domain/repositories/worklog-repository'
import { IssueRepository } from '../../modules/issue/domain/repositories/issue-repository'
import { CommitRepository } from '../../modules/commit/domain/repositories/commit-repository'

// Infrastructure implementations (provider-specific)
import { JiraWorklogRepository } from '../../modules/worklog/infrastructure/repositories/jira-worklog-repository'
import { JiraIssueRepository } from '../../modules/issue/infrastructure/repositories/jira-issue-repository'
import { GitLabCommitRepository } from '../../modules/commit/infrastructure/repositories/gitlab-commit-repository'

// Domain services
import { WorklogCalculationService } from '../../modules/reconciliation/domain/services/worklog-calculation-service'
import { WorklogCalculationServiceImpl } from '../../modules/reconciliation/infrastructure/services/worklog-calculation-service-impl'

// Use cases
import { SyncWorklogEntriesUseCase } from '../../modules/worklog/application/use-cases/sync-worklog-entries-use-case'
import { CalculateWorklogsFromCommitsUseCase } from '../../modules/reconciliation/application/use-cases/calculate-worklogs-from-commits-use-case'

export const container = new Container()

// Bind repositories (interfaces to implementations)
container.bind<WorklogRepository>(InjectionKey.WorklogRepository)
  .to(JiraWorklogRepository)
  .inSingletonScope()

container.bind<IssueRepository>(InjectionKey.IssueRepository)
  .to(JiraIssueRepository)
  .inSingletonScope()

container.bind<CommitRepository>(InjectionKey.CommitRepository)
  .to(GitLabCommitRepository)
  .inSingletonScope()

// Bind domain services
container.bind<WorklogCalculationService>(InjectionKey.WorklogCalculationService)
  .to(WorklogCalculationServiceImpl)
  .inSingletonScope()

// Bind use cases
container.bind<SyncWorklogEntriesUseCase>(InjectionKey.SyncWorklogEntriesUseCase)
  .to(SyncWorklogEntriesUseCase)

container.bind<CalculateWorklogsFromCommitsUseCase>(InjectionKey.CalculateWorklogsFromCommitsUseCase)
  .to(CalculateWorklogsFromCommitsUseCase)
```

### Injection Keys (Enum)

```typescript
// core/ioc/injection-key.enum.ts
export enum InjectionKey {
  // Repository interfaces (domain)
  WorklogRepository = 'WorklogRepository',
  IssueRepository = 'IssueRepository',
  ProjectRepository = 'ProjectRepository',
  CommitRepository = 'CommitRepository',
  ContributorRepository = 'ContributorRepository',
  
  // Domain services
  WorklogCalculationService = 'WorklogCalculationService',
  IssueKeyExtractor = 'IssueKeyExtractor',
  
  // Use cases
  SyncWorklogEntriesUseCase = 'SyncWorklogEntriesUseCase',
  FetchWorklogEntriesUseCase = 'FetchWorklogEntriesUseCase',
  CalculateWorklogsFromCommitsUseCase = 'CalculateWorklogsFromCommitsUseCase',
}
```

**Note:** Using a string enum instead of Symbols provides:
- Simpler syntax and better IDE autocomplete
- Easier debugging (enum values are visible in stack traces)
- No need for `Symbol.for()` calls
- Works perfectly with InversifyJS

## Elysia Controller Example

```typescript
// modules/worklog/presentation/controllers/worklog-controller.ts
import { Elysia } from 'elysia'
import { container } from '../../../core/ioc/container'
import { InjectionKey } from '../../../core/ioc/injection-key.enum'
import { FetchWorklogEntriesUseCase } from '../../application/use-cases/fetch-worklog-entries-use-case'
import { SyncWorklogEntriesUseCase } from '../../application/use-cases/sync-worklog-entries-use-case'
import { WorklogRequestDto } from '../dtos/worklog-request-dto'
import { WorklogResponseDto } from '../dtos/worklog-response-dto'

export const worklogRoutes = new Elysia({ prefix: '/api/worklogs' })
  .get('/', async ({ query }) => {
    const useCase = container.get<FetchWorklogEntriesUseCase>(
      InjectionKey.FetchWorklogEntriesUseCase
    )
    
    const dto = WorklogRequestDto.fromQuery(query)
    const result = await useCase.execute(dto.toCommand())
    
    return WorklogResponseDto.fromDomain(result)
  })
  .post('/sync', async ({ body }) => {
    const useCase = container.get<SyncWorklogEntriesUseCase>(
      InjectionKey.SyncWorklogEntriesUseCase
    )
    
    const command = SyncWorklogEntriesCommand.fromDto(body)
    const result = await useCase.execute(command)
    
    return SyncResultDto.fromDomain(result)
  })
```

## Benefits of Domain-Driven Approach

1. **Provider Independence**: Domain logic is independent of Jira/GitLab specifics
2. **Testability**: Domain services can be tested without external APIs
3. **Flexibility**: Easy to add new providers (GitHub, Azure DevOps, etc.)
4. **Clear Boundaries**: Domain layer contains business rules, infrastructure handles providers
5. **Maintainability**: Changes to provider APIs don't affect domain logic

## Migration Strategy

### Phase 1: Domain Layer
1. Define domain entities (WorklogEntry, Issue, Commit, etc.)
2. Define repository interfaces
3. Define domain services interfaces
4. Implement domain validators

### Phase 2: Infrastructure Layer
1. Implement provider clients (JiraApiClient, GitLabApiClient)
2. Create adapters (map provider models → domain entities)
3. Implement repositories (JiraWorklogRepository, etc.)
4. Implement domain services (WorklogCalculationService)

### Phase 3: Application Layer
1. Extract use cases from route handlers
2. Create commands and queries
3. Wire use cases with repositories via InversifyJS

### Phase 4: Presentation Layer
1. Create Elysia controllers
2. Create DTOs for request/response
3. Wire controllers with use cases

## Next Steps

1. Review and approve domain model
2. Start with Worklog domain module (core entity)
3. Implement reconciliation module (complex business logic)
4. Add other modules incrementally
