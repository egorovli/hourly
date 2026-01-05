# Contributing to Hourly

Thanks for your interest in contributing. This guide will help you get started.

## Code of Conduct

By participating, you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md). Be respectful, no exceptions.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Install dependencies:

```bash
bun install
```

4. Set up environment variables (see [README](README.md#environment))
5. Run migrations and start the dev server:

```bash
cd packages/web
bun run db:migrate
bun run dev
```

## Development Workflow

### Branch Naming

Create a branch from `main` with a descriptive name:

```
feat/calendar-export
fix/oauth-refresh-token
chore/update-dependencies
docs/api-reference
```

### Code Style

We use [Biome](https://biomejs.dev/) for linting and formatting. Before committing:

```bash
bun run --filter @hourly/web lint:fix
bun run --filter @hourly/web types:check
```

Key conventions:
- Single quotes, tabs (width 2), 100 char lines
- Named exports only (no default exports)
- `~/` path alias for imports
- kebab-case filenames
- Prefer `undefined` over `null`

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `perf`, `build`

Examples:
- `feat(web): add calendar export`
- `fix(api): resolve OAuth token refresh race condition`
- `docs: update contributing guide`

## Pull Requests

1. Create a branch from `main`
2. Make your changes
3. Run lint and type checks
4. Push your branch
5. Open a PR against `main`

### PR Guidelines

- Use a clear, descriptive title following commit message format
- Reference related issues (e.g., "Closes #42")
- Keep PRs focused — one feature or fix per PR
- Add screenshots for UI changes
- Respond to review feedback promptly

## Reporting Issues

### Bugs

Include:
- Steps to reproduce
- Expected vs actual behavior
- Browser/environment details
- Screenshots or error messages if applicable

### Feature Requests

Describe:
- The problem you're trying to solve
- Your proposed solution
- Alternatives you've considered

## Questions?

Open a [GitHub Discussion](https://github.com/egorovli/hourly/discussions) for questions or ideas.

