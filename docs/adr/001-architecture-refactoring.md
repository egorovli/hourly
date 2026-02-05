# ADR-001: Architecture Refactoring for v2.0.0

## Status

Proposed

## Context

The current codebase has grown organically with tight coupling between:
- Route handlers and external API clients (Atlassian, GitLab)
- Data access logic and business rules
- Infrastructure concerns and domain logic

This makes the code difficult to test in isolation and harder to maintain as the application grows.

## Decision

We will refactor the architecture following these principles:

### Candidates Under Consideration

1. **Clean Architecture** (Robert C. Martin)
   - Dependency Rule: dependencies point inward
   - Use Cases at the center
   - Entities contain enterprise business rules

2. **Hexagonal Architecture** (Alistair Cockburn)
   - Ports (interfaces) define boundaries
   - Adapters implement external integrations
   - Application core is framework-agnostic

3. **Domain-Driven Design** (Eric Evans)
   - Ubiquitous language
   - Bounded contexts
   - Rich domain models with behavior

### Proposed Layer Structure

```
app/
├── domain/           # Pure domain logic, entities, value objects
│   └── (no external dependencies)
│
├── application/      # Use cases, ports (interfaces)
│   ├── ports/        # Repository interfaces, service interfaces
│   └── use-cases/    # Application-specific business rules
│
├── infrastructure/   # Adapters, implementations
│   ├── adapters/     # API clients, database repositories
│   └── config/       # Framework configuration
│
├── presentation/     # UI layer
│   ├── routes/       # React Router routes
│   └── components/   # React components
│
└── shared/           # Cross-cutting concerns
    └── util/         # Pure utility functions
```

### Key Principles

1. **Depend on abstractions** - Use interfaces (ports) for external dependencies
2. **Invert dependencies** - High-level modules don't depend on low-level modules
3. **Single Responsibility** - Each module has one reason to change
4. **Testability** - Business logic testable without infrastructure

## Consequences

### Positive
- Easier to test business logic in isolation
- Swappable implementations (e.g., mock vs real API clients)
- Clear boundaries make navigation easier
- Reduced coupling between modules

### Negative
- More files and indirection
- Learning curve for contributors
- Initial refactoring effort

### Neutral
- Need to establish conventions and document patterns
- May need dependency injection setup

## References

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
