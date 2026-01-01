# Hourly

Reconcile GitLab commits with Jira worklogs to automate monthly time allocation.

🌐 **[Live Demo](https://hourly.egorov.io)** | 📖 **[Documentation](#)**

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
**UI:** Tailwind 4, shadcn/ui, Radix, react-big-calendar (with drag-and-drop)
**State:** TanStack Query v5, SQLite, MikroORM 6
**Auth:** Remix Auth (OAuth2 for Atlassian/GitLab)
**Validation:** Zod 4, Conform
**Testing:** Jest, Testing Library
**Tooling:** Biome, TypeScript strict, dbmate

## Prerequisites

- Bun >= 1.0.0
- Node.js >= 20.x
- Atlassian account with Jira access
- GitLab account (gitlab.com or self-hosted)

## Setup

```bash
# Clone and install
git clone https://github.com/egorovli/hourly.git
cd hourly
bun install

# Configure environment
cd packages/web
# Create .env file with OAuth credentials and SESSION_SECRET
# See Configuration section below for required variables

# Database setup
bun run db:migrate
bun run db:status

# Start dev server
cd ../..
bun run --filter @hourly/web dev
```

Visit http://localhost:3000

**Production:** [https://hourly.egorov.io](https://hourly.egorov.io)

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
│   │   ├── routes/              # React Router v7 file-based routes
│   │   ├── components/         # React components (calendar, UI, shadcn)
│   │   ├── lib/                 # API clients, ORM, auth, utilities
│   │   ├── domain/              # Domain types, enums, preferences
│   │   ├── hooks/               # Custom React hooks
│   │   ├── contexts/            # React contexts (drag, etc.)
│   │   ├── styles/              # Global CSS files
│   │   ├── assets/              # Static assets (fonts, etc.)
│   │   ├── entry.client.tsx     # Client entry point
│   │   ├── entry.server.tsx     # Server entry point
│   │   └── root.tsx             # Root layout component
│   ├── db/
│   │   └── migrations/          # Database migrations (dbmate)
│   ├── data/                    # SQLite database file (gitignored)
│   └── public/                  # Public static assets
├── .github/                     # GitHub Actions workflows
├── docs/                        # Documentation
├── AGENTS.md                    # Agent development guidelines
├── CLAUDE.md                    # Development guidelines
└── README.md
```

## Architecture

The application follows a modular structure with clear separation of concerns:

- **Routes**: React Router v7 file-based routing with loaders and actions
- **Components**: Reusable UI components organized by feature/domain
- **Lib**: Infrastructure layer (API clients, ORM, auth strategies, utilities)
- **Domain**: Business logic types, enums, and domain models
- **Hooks & Contexts**: Shared React state and behavior

### Auth Flow

1. OAuth flow initiated (Atlassian/GitLab)
2. Exchange authorization code for tokens
3. Store tokens in SQLite via MikroORM
4. Merge provider data into single session
5. Session persisted with automatic cleanup

### Data Loading

- Resource routes return JSON for TanStack Query
- TanStack Query v5 for data fetching and caching
- Handles: worklog entries, Jira issues, GitLab commits, commit-issue mapping
- Pagination supported via query parameters

### Worklog Synchronization

The app uses an **idempotent sync strategy** for persisting calendar edits to Jira:
1. Fetch all existing worklogs for the user in the date range
2. Delete all existing worklogs (for the selected user/date range)
3. Create new worklogs matching current calendar state
4. Returns success/failure counts for deletions and creations

This ensures calendar state always matches Jira state after save, while handling concurrent edits gracefully.

## Configuration

### Environment Variables

Create a `.env` file in `packages/web/` with the following variables:

```bash
# Atlassian OAuth2
OAUTH_ATLASSIAN_CLIENT_ID=<client-id>
OAUTH_ATLASSIAN_CLIENT_SECRET=<secret>
OAUTH_ATLASSIAN_CALLBACK_URL=http://localhost:3000/auth/atlassian/callback
# Optional: OAUTH_ATLASSIAN_BASE_URL=https://api.atlassian.com

# GitLab OAuth2
OAUTH_GITLAB_CLIENT_ID=<app-id>
OAUTH_GITLAB_CLIENT_SECRET=<secret>
OAUTH_GITLAB_CALLBACK_URL=http://localhost:3000/auth/gitlab/callback
# Optional: OAUTH_GITLAB_BASE_URL=https://gitlab.com

# Session
SESSION_SECRET=<random-secret>
# Optional: SESSION_SECURE=true (for HTTPS in production)

# Database (optional, defaults to SQLite)
# DATABASE_URL=file:./data/database.sqlite3

# Version (optional, for user agent)
# VERSION=0.0.1
```

The reporter worker reuses the Atlassian OAuth values above. Optional overrides for its token refresh schedule:

- `TEMPORAL_TOKEN_REFRESH_SCHEDULE_ID` (default `atlassian-token-refresh-schedule`)
- `ATLASSIAN_TOKEN_REFRESH_INTERVAL` (default `1h`, schedule cadence)

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

Tests co-located with source files using Jest and Testing Library.

## Deployment

### Docker (Recommended)

The project includes a Dockerfile and GitHub Actions workflow for automated builds:

```bash
# Build Docker image
docker build -t hourly-web --target web .

# Run container
docker run -p 3000:3000 \
  -e ATLASSIAN_CLIENT_ID=... \
  -e ATLASSIAN_CLIENT_SECRET=... \
  -e GITLAB_APPLICATION_ID=... \
  -e GITLAB_APPLICATION_SECRET=... \
  -e SESSION_SECRET=... \
  -v $(pwd)/packages/web/data:/app/packages/web/data \
  hourly-web
```

### Manual Deployment

```bash
# Build
bun run --filter @hourly/web build

# Migrate database
cd packages/web && bun run db:migrate

# Start
bun run --filter @hourly/web start
```

**Note:** The database file (`data/database.sqlite3`) must be persisted between deployments.

## Troubleshooting

**Database locked:**
```bash
# Stop all processes, remove data/database.sqlite3-journal if exists
cd packages/web && bun run db:migrate
```

**OAuth errors:** Verify callback URLs match provider settings exactly.

**Type errors:** `bun run --filter @hourly/web types:check`

**Lint errors:** `bun run lint:fix`

## Roadmap

### ✅ Completed

**Core Infrastructure**
- Dual OAuth authentication (Atlassian + GitLab)
- Session management with automatic token refresh
- SQLite persistence with MikroORM
- React Router v7 SSR architecture

**Data Integration**
- Jira API: Projects, users, issues, worklog entries
- GitLab API: Projects, contributors, commits
- Issue key extraction from commit messages
- TanStack Query for data fetching and caching

**UI & Interaction**
- Calendar widget with drag-and-drop editing (react-big-calendar)
- Multi-view support (month, week views)
- Filter panel (projects, users, date ranges)
- Settings & preferences (theme, timezone, locale, working hours)
- Local worklog editor with change tracking

**Reconciliation Engine**
- ✅ Bidirectional sync: Calendar edits persist to Jira API (idempotent sync)
- ✅ Commit-to-worklog matching algorithm (groups commits by day/issue, splits workday)
- ✅ Automated worklog suggestions from commit activity
- ✅ Drag-and-drop from external issue search panel

### 🚧 In Progress

**Data Completeness**
- Pagination for Jira projects/users endpoints
- Bulk operations for large datasets

### 📋 Planned

**Provider Abstraction** (v2.0)
- Pluggable provider architecture
- Support for alternative time tracking systems (Tempo, Toggl)
- Support for alternative VCS platforms (GitHub, Bitbucket)
- Generic reconciliation interface

**Reporting & Export**
- Monthly time summary reports
- Time distribution visualizations by project/issue
- Export to CSV/PDF formats
- Historical trend analysis

**Localization**
- Multi-language support (i18n)
- Locale-aware date/time formatting

**Advanced Features**
- Automated worklog suggestions based on commit activity
- Smart time splitting across multiple issues
- Team visibility and approvals workflow
- Browser extension for quick time logging

### Project Completion Criteria

The project will be considered complete when:
1. ✅ Users can authenticate with both providers
2. ✅ Worklogs display on interactive calendar
3. ✅ Calendar edits persist back to Jira (idempotent sync via delete/create)
4. ✅ Commits reconcile with worklogs automatically (calculate-worklogs-from-commits)
5. ❌ Monthly reports generate accurately
6. ❌ Export functionality works for all formats (CSV/PDF)

Contributions welcome. See [CLAUDE.md](./CLAUDE.md) for development guidelines.

## Docs

- [CLAUDE.md](./CLAUDE.md) - Development guidelines
- [React Router](https://reactrouter.com/)
- [TanStack Query](https://tanstack.com/query)
- [MikroORM](https://mikro-orm.io/)

## License

MIT
