# API Clean Architecture Review

_Snapshot: 2025-11-01_

## Current State
- Repository split between `packages/api` (API) and `packages/web` (SPA); API code already follows `core`, `modules`, `infrastructure`, and `cmd` folders with vertical slices for `auth` and `project`.
- Domain layer features rich entities/value objects with invariant checks (for example `modules/project/domain/entities/project.ts`, `modules/auth/domain/entities/oauth-token.ts`) and repository/service interfaces that keep infrastructure abstracted.
- Application layer is only represented by `modules/project/application/use-cases/list-projects-use-case.ts`; other modules (e.g. auth) lack use cases and commands, leaving domain logic without orchestrators.
- Composition root lives in `core/ioc/container.ts` and binds a few services (`ListProjectsUseCase`, `UserProfileFactory`, `ZodUserProfileValidator`), but no repositories or HTTP adapters are wired in yet.
- Interface adapter layer is still nascent: `infrastructure/http/index.ts` exposes raw Elysia routes, and there are no controllers/presenters translating between HTTP DTOs and use cases.
- Automated tests cover domain validation (see `modules/auth/domain/entities/user-profile.test.ts` and `modules/auth/infrastructure/validators/zod-user-profile-validator.test.ts`), but there are no tests exercising application flows or infrastructure boundaries.

## Alignment with Clean Architecture Principles
- Modules respect the dependency rule by keeping domain code free of framework imports and depending only on abstractions, matching guidance from recent Clean Architecture write-ups for Node/TypeScript [1][2].
- Dependency inversion is achieved through Inversify bindings and domain-level interfaces, aligning with modern DI best practices for Node/Bun ecosystems [1][3].
- Entity/value object design enforces invariants at construction time, which mirrors 2025 recommendations for keeping business rules close to the core domain [3].

## Gaps and Risks
- Lack of application-layer use cases outside the `project` module leaves the `auth` domain without orchestrating services, risking business logic leaks into infrastructure.
- HTTP layer bypasses the container and calls Elysia directly; without controllers or presenters, request parsing/validation will drift into infrastructure and violate separation of concerns.
- No repository implementations are registered, and infrastructure concerns (database/Jira/GitLab clients) are absent, so the IoC container cannot compose a working application yet.
- Composition root is a single global container; without module-scoped `ContainerModule`s or lifetime management, the project will become harder to maintain as more services are added.
- Temporal fields are represented as strings throughout domain entities (`authentication.ts`, `oauth-token.ts`, `oauth-authorization-request.ts`), increasing the chance of invalid state and duplicated parsing logic across layers.
- Documentation-style comments describe desired practices, but there is limited enforcement through tests or tooling, so regressions may go unnoticed.

## Recommendations
1. Introduce application-layer use cases for the auth module (e.g. `CreateUserProfileUseCase`, `LinkAuthenticationUseCase`) and ensure HTTP/infrastructure code only talks to these orchestrators.
2. Add interface adapters (controllers/handlers and DTO mappers) that translate HTTP requests into commands and map use-case results back to responses, then wire them through the Inversify container before exposing them via Elysia.
3. Implement infrastructure adapters for repository interfaces (e.g. MikroORM, Jira/GitLab gateways) and register them using scoped bindings; leverage `ContainerModule`s to keep module wiring localized as suggested by current Inversify guidance [1][3].
4. Move temporal and identifier primitives into dedicated value objects (e.g. `UtcDateTime`, `ProviderAccountId`) to centralize validation and reduce duplication, as promoted by recent clean architecture discussions [2][3].
5. Expand automated tests beyond entity validation: add use-case unit tests with mocked repositories and adapter tests to enforce the architectural boundaries.
6. Ensure the composition root (`core/ioc`) remains the outermost layer: keep container wiring free from imports back into infrastructure-specific modules except via interfaces, and expose a factory that the CLI/HTTP entry points can consume.

## References
- [1] Vishnu C. Prasad, “Clean Architecture with Inversify in Node.js with TypeScript: A Code-Driven Guide,” DEV Community, Aug 2023. https://dev.to/vishnucprasad/clean-architecture-with-inversify-in-nodejs-with-typescript-a-code-driven-guide-4oo7
- [2] “Clean Architecture in Node.js with TypeScript,” xjavascript.com, Oct 2025. https://www.xjavascript.com/blog/clean-architecture-node-js-typescript/
- [3] Perplexity AI, “Clean architecture best practices for Node.js/TypeScript with Inversify (2025),” Nov 2025. https://www.perplexity.ai/search?q=2025+clean+architecture+Node.js+TypeScript+inversify+best+practices
