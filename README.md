# Hourly

Reconcile GitLab commits with Jira worklogs to automate monthly time allocation.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Bun](https://img.shields.io/badge/bun-latest-black)
![React](https://img.shields.io/badge/react-19-blue)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue)

> Development Status: Active development. Core functionality stable, some features in progress.

## What It Does

- Syncs Jira worklog entries with GitLab commit activity
- Maps reconciled data onto a calendar with drag-and-drop editing
- Visualizes time distribution across projects
- Handles timezone-aware time tracking

## Stack

**Runtime:** Bun, React Router v7 (SSR), React 19
**UI:** Tailwind 4, shadcn/ui, Radix, react-big-calendar
**State:** TanStack Query v5, SQLite, MikroORM 6
**Auth:** Remix Auth (OAuth2 for Atlassian/GitLab)
**Validation:** Zod 4, Conform
**Testing:** Jest, Testing Library, Playwright
**Tooling:** Biome, TypeScript strict, dbmate

## Prerequisites

- Bun >= 1.0.0
- Node.js >= 20.x
- Atlassian account with Jira access
- GitLab account (gitlab.com or self-hosted)

## Setup

```bash
# Clone and install
git clone <repository-url>
cd hourly
bun install

# Configure environment
cd packages/web
cp .env.example .env
# Edit .env with OAuth credentials and SESSION_SECRET

# Database setup
bun run db:migrate
bun run db:status

# Start dev server
cd ../..
bun run --filter @hourly/web dev
```

Visit http://localhost:3000

## OAuth Configuration

### Atlassian (Jira)

1. [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/)
2. Create OAuth 2.0 app
3. Callback: `http://localhost:3000/auth/atlassian/callback`
4. Scopes: `read:jira-work`, `read:jira-user`, `offline_access`

### GitLab

1. GitLab → Settings → Applications
2. Callback: `http://localhost:3000/auth/gitlab/callback`
3. Scopes: `read_user`, `read_api`, `read_repository`

## Development

```bash
# Commands
bun run --filter @hourly/web dev          # Dev server
bun run --filter @hourly/web types:check  # Type checking
bun run lint                              # Lint check
bun run lint:fix                          # Auto-fix
bun run --filter @hourly/web test         # Tests
bun run --filter @hourly/web build        # Production build

# Database
cd packages/web
bun run db:new migration-name    # New migration
bun run db:migrate               # Run migrations
bun run db:rollback              # Rollback
bun run db:status                # Status

# Add shadcn/ui components
bunx --bun shadcn@latest add <component-name>
```

## Structure

```
hourly/
├── packages/web/
│   ├── app/
│   │   ├── routes/              # React Router v7 routes
│   │   ├── shared/              # FSD shared layer (ui, lib, config)
│   │   ├── widgets/             # Composite UI blocks
│   │   ├── features/            # Business features
│   │   ├── entities/            # Domain models
│   │   ├── lib/                 # API clients, ORM, auth
│   │   ├── domain/              # Business logic & types
│   │   └── styles/              # Global CSS
│   └── db/migrations/           # Database migrations
├── CLAUDE.md                    # Development guidelines
└── README.md
```

## Architecture

Uses [Feature-Sliced Design](https://feature-sliced.design/) with strict layer hierarchy:

```
app/ → pages/ → widgets/ → features/ → entities/ → shared/
```

Import rules enforced: layers only import from layers below.

### Auth Flow

1. OAuth flow initiated (Atlassian/GitLab)
2. Exchange authorization code for tokens
3. Store tokens in SQLite via MikroORM
4. Merge provider data into single session
5. Session persisted with automatic cleanup

### Data Loading

- Resource routes return JSON for TanStack Query
- Custom `useAutoLoadInfiniteQuery` for background pagination
- Handles: worklog entries, Jira issues, GitLab commits
- Progress tracked with `AutoLoadProgress` component

## Configuration

### Environment Variables

```bash
# Atlassian OAuth2
ATLASSIAN_CLIENT_ID=<client-id>
ATLASSIAN_CLIENT_SECRET=<secret>
ATLASSIAN_CALLBACK_URL=http://localhost:3000/auth/atlassian/callback

# GitLab OAuth2
GITLAB_APPLICATION_ID=<app-id>
GITLAB_APPLICATION_SECRET=<secret>
GITLAB_CALLBACK_URL=http://localhost:3000/auth/gitlab/callback
GITLAB_BASE_URL=https://gitlab.com

# Session
SESSION_SECRET=<random-secret>
```

### User Preferences

Stored in cookie, configurable via Settings:

- Theme (light/dark/system)
- Timezone (IANA format)
- Week start day (0=Sunday)
- Working hours (HH:MM format)
- Locale

## Testing

```bash
bun run --filter @hourly/web test
```

Tests co-located with source files. Dev login shortcut: `GET /dev/hijack-session`

## Deployment

```bash
# Build
bun run --filter @hourly/web build

# Migrate database
cd packages/web && bun run db:migrate

# Start
bun run --filter @hourly/web start
```

## Troubleshooting

**Database locked:**
```bash
# Stop all processes, remove db/data.db-journal if exists
bun run db:migrate
```

**OAuth errors:** Verify callback URLs match provider settings exactly.

**Type errors:** `bun run --filter @hourly/web types:check`

**Lint errors:** `bun run lint:fix`

## Docs

- [CLAUDE.md](./CLAUDE.md) - Development guidelines
- [React Router](https://reactrouter.com/)
- [TanStack Query](https://tanstack.com/query)
- [MikroORM](https://mikro-orm.io/)

## License

MIT
