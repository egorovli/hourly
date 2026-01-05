---
description: When running package management commands (install, add, remove), executing scripts (dev, build, test), running build tools, or working with Node.js runtime commands. Apply when suggesting commands, setting up development environment, configuring build processes, or troubleshooting execution issues. Critical for ensuring compatibility with the Bun-based project setup.
alwaysApply: false
---


Guidance for Claude Code when working in this repo.

## Project
- Purpose: reconcile GitLab commits ↔ Jira issues → monthly hours
- Stack: Bun, React Router v7 (SSR), React 19, Tailwind 4, shadcn/ui, Radix, TanStack Query v5, PostgreSQL + MikroORM 6, Remix Auth (Atlassian+GitLab), Zod, Jest/Testing Library

## Serena MCP Project Activation (Mandatory)
- **Always activate Serena MCP project at the start of new agent interactions** (if not already activated)
- Use `mcp_serena_activate_project` with project name `'hourly'`
- Check activation status with `mcp_serena_get_current_config` if unsure
- Serena provides semantic coding tools for efficient code exploration and editing

## Doc Search (Mandatory)
Use Context7 MCP before new/unknown APIs:
- Context7: resolve library → get docs (topic optional)
- Example: infinite scroll → Context7 "useInfiniteQuery"

## Commands
```bash
bun install
bun run --filter @hourly/web dev
bun run --filter @hourly/web types:check
bun run --filter @hourly/web lint
bun run --filter @hourly/web lint:fix
# DB (dbmate)
cd packages/web && bun run db:migrate|db:rollback|db:new <name>|db:status
# Build/Start
bun run --filter @hourly/web build
bun run --filter @hourly/web start
# Tests (infrastructure ready, no tests yet)
bun run --filter @hourly/web test
```

## Architecture
- `app/routes/` - React Router v7 file routes
- `app/components/` - Shared UI components (includes `shadcn/ui` and `shadcn/blocks`)
- `app/lib/` - Utilities, API clients, auth, ORM setup
- `app/domain/` - Domain types, enums, schemas
- `app/hooks/` - Custom React hooks
- `app/styles/` - Global CSS files

## Key Patterns
- Auth: dual OAuth (Atlassian, GitLab); merged DB session; routes `auth.$provider.*`
- Data loading: resource routes (`api.*.tsx`) return JSON for TanStack Query
- Infinite queries: standard `useInfiniteQuery` with `getNextPageParam` option
- Worklog sync: idempotent sync strategy (delete existing, create new) in `api.worklog.entries.tsx` action
- DB: MikroORM entities (Session, Token, Profile, ProfileSessionConnection), `orm.em.fork()`, migrations in `db/migrations/`
- API clients: `lib/atlassian/client.ts`, `lib/gitlab/client.ts` with token refresh

## Code Style (Biome)
- Ignore formatting; run `bun run --filter @hourly/web lint:fix` (or `bunx --bun biome check . --write --unsafe`)
- Conventions: no default exports (except routes/config/tests), single quotes, tabs (vw=2), 100 cols, import extensions, kebab-case, `~/` alias
- TS strict; explicit return types for shared utils; domain types/schemas in `app/domain`
- Prefer `undefined` over `null` for "no value" semantics
- Avoid using the `Boolean(...)` constructor for casting; use explicit comparisons instead (e.g. `typeof name === 'string' && name.length > 0`)

## Import Ordering (Required)
Follow eslint-plugin-import order rules. Group imports in this order, separated by blank lines:
1. **Type imports** (`import type { ... } from ...`) - ALL type-only imports first
2. **Node/Bun built-ins** - Built-in modules (e.g., `fs`, `path`)
3. **External modules** - Dependencies from `node_modules` (e.g., `react-router`, `@tanstack/react-query`)
4. **Local imports** - Relative imports from the project (e.g., `~/lib/...`)

**Rules:**
- Always use `import type { ... }` syntax, NOT `import { type ... }`
- Never mix value and type imports in the same statement
- Separate groups with blank lines
- Alphabetize within each group
- Value imports use the class/function, type imports use only types/interfaces

**Example:**
```ts
import type { JiraIssueSearchResult } from '~/lib/atlassian/issue.ts'
import type { LoaderFunctionArgs } from 'react-router'

import { useQuery } from '@tanstack/react-query'

import { AtlassianClient } from '~/lib/atlassian/client.ts'
```

### Dev-safe singleton
```ts
// Example from lib/redis/client.ts
export let redis: Redis

declare global {
  var __redis: Redis | undefined
}

function createRedis(): Redis {
  return new Redis(process.env.REDIS_URL)
}

if (process.env.NODE_ENV === 'development') {
  global.__redis ??= createRedis()
  redis = global.__redis
} else {
  redis = createRedis()
}
```

## shadcn/ui
```bash
cd packages/web
bunx --bun shadcn@latest add <component>
```
Post‑gen fixes: files in `app/components/shadcn/ui` (blocks in `app/components/shadcn/blocks`); replace `@/lib/utils` → `~/lib/util/index.ts`; ensure named exports; remove `@/` imports.

## Env (.env in packages/web)
- Database: `DATABASE_URL`
- Redis: `REDIS_URL`
- Atlassian: `OAUTH_ATLASSIAN_CLIENT_ID`, `OAUTH_ATLASSIAN_CLIENT_SECRET`, `OAUTH_ATLASSIAN_CALLBACK_URL`
- GitLab: `OAUTH_GITLAB_CLIENT_ID`, `OAUTH_GITLAB_CLIENT_SECRET`, `OAUTH_GITLAB_CALLBACK_URL`, `OAUTH_GITLAB_BASE_URL` (optional)
- Session: `SESSION_SECRET_{n}` (multiple secrets with numbered suffixes), `SESSION_SECURE` (`'true'` or `'false'`)

## Testing patterns
- Infrastructure ready (Jest + Testing Library); no tests written yet
- Co‑locate `*.test.tsx` files; use Testing Library queries over snapshots
- Jest config: `jest.config.ts`; run with `bun run --filter @hourly/web test`

## Notes
- Route naming: `__.tsx` root layout; `__._index.tsx` nested index; `$provider` params
- Calendar: Uses `@fullcalendar/react` v6 with timegrid/interaction plugins; lazy-loaded; custom toolbar/event components
- Sessions: DB‑backed `createSessionStorage` with expiration/cleanup
- OAuth refresh: automatic; refresh tokens in DB; check expiry
- Worklog sync: Idempotent delete/create strategy ensures calendar matches Jira after save

## README
- Keep in sync: validate, update, prune, and sync user‑facing/env sections after changes
