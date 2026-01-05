# Hourly

[![Build](https://github.com/egorovli/hourly/actions/workflows/build.yml/badge.svg)](https://github.com/egorovli/hourly/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Reconcile GitLab commits with Jira worklogs. Drag-and-drop calendar for time tracking.

**[Live Demo](https://hourly.egorov.io)**

## Features

- **OAuth authentication** with Atlassian and GitLab
- **Calendar view** with drag-and-drop worklog editing
- **Commit reconciliation** — auto-generate worklogs from GitLab commits *(planned)*
- **Jira sync** — calendar edits persist to Jira

## Stack

Bun · React Router v7 · React 19 · TanStack Query · PostgreSQL · MikroORM · Tailwind · shadcn/ui

## Project Structure

```
packages/
├── web/           # Main React application
│   ├── app/
│   │   ├── components/   # UI components (shadcn/ui)
│   │   ├── domain/       # Domain types and enums
│   │   ├── lib/          # Core libraries (auth, clients, ORM)
│   │   └── routes/       # React Router file-based routes
│   └── db/migrations/    # Database migrations
└── workers/       # Background workers (Go/Temporal)
```

## Setup

```bash
bun install
cd packages/web
# Configure .env with OAuth credentials (see below)
bun run db:migrate
bun run dev
```

### Environment

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/hourly
REDIS_URL=redis://localhost:6379

OAUTH_ATLASSIAN_CLIENT_ID=
OAUTH_ATLASSIAN_CLIENT_SECRET=
OAUTH_ATLASSIAN_CALLBACK_URL=http://localhost:3000/auth/atlassian/callback

OAUTH_GITLAB_CLIENT_ID=
OAUTH_GITLAB_CLIENT_SECRET=
OAUTH_GITLAB_CALLBACK_URL=http://localhost:3000/auth/gitlab/callback

SESSION_SECRET_1=your-secret-here
SESSION_SECURE=false
```

## Commands

```bash
bun run --filter @hourly/web dev          # Dev server (:3000)
bun run --filter @hourly/web build        # Production build
bun run --filter @hourly/web types:check  # Type check
bun run --filter @hourly/web lint:fix     # Lint + format
```

## Contributing

Contributions are welcome. Please read the [Contributing Guide](CONTRIBUTING.md) and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Community

- [GitHub Issues](https://github.com/egorovli/hourly/issues) — bug reports, feature requests
- [GitHub Discussions](https://github.com/egorovli/hourly/discussions) — questions, ideas, show & tell

## License

MIT
