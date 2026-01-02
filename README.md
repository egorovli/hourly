# Hourly

Reconcile GitLab commits with Jira worklogs. Drag-and-drop calendar for time tracking.

**[Live Demo](https://hourly.egorov.io)**

## Features

- **OAuth authentication** with Atlassian and GitLab
- **Calendar view** with drag-and-drop worklog editing
- **Commit reconciliation** — auto-generate worklogs from GitLab commits
- **Bidirectional sync** — calendar edits persist to Jira

## Stack

Bun · React Router v7 · React 19 · TanStack Query · SQLite · MikroORM · Tailwind · shadcn/ui

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
OAUTH_ATLASSIAN_CLIENT_ID=
OAUTH_ATLASSIAN_CLIENT_SECRET=
OAUTH_ATLASSIAN_CALLBACK_URL=http://localhost:3000/auth/atlassian/callback

OAUTH_GITLAB_CLIENT_ID=
OAUTH_GITLAB_CLIENT_SECRET=
OAUTH_GITLAB_CALLBACK_URL=http://localhost:3000/auth/gitlab/callback

SESSION_SECRET=
```

## Commands

```bash
bun run --filter @hourly/web dev          # Dev server (:3000)
bun run --filter @hourly/web build        # Production build
bun run --filter @hourly/web types:check  # Type check
bun run lint:fix                          # Lint + format
```

## License

MIT
