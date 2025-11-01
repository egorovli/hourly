# CLAUDE.md (Concise)

Guidance for Claude Code when working in this repo.

## Project
- Purpose: reconcile GitLab commits ↔ Jira issues → monthly hours
- Stack: Bun, React Router v7 (SSR), React 19, Tailwind 4, shadcn/ui, Radix, TanStack Query v5, SQLite + MikroORM 6, Remix Auth (Atlassian+GitLab), Zod, Conform, Jest/Testing Library/Playwright
- **Troubleshooting**: If encountering errors, consult `TROUBLESHOOTING.md` for common issues and solutions

## Serena MCP Project Activation (Mandatory)
- **Always activate Serena MCP project at the start of new agent interactions** (if not already activated)
- Use `mcp_serena_activate_project` with project name `'working-hours'` or project path
- Check activation status with `mcp_serena_get_current_config` if unsure
- Serena provides semantic coding tools for efficient code exploration and editing

## Doc Search (Mandatory)
Use all three before new/unknown APIs; cross‑check findings:
1) Context7: resolve library → get docs (topic optional)
2) DDG Search: articles/guides/StackOverflow
3) Perplexity: AI w/ recency filter
Example: infinite scroll → Context7 "useInfiniteQuery", DDG "React Router v7 infinite scroll", Perplexity recency="week".

## Commands
```bash
bun install
bun run --filter @hourly/web dev
bun run --filter @hourly/web types:check
bun run lint && bun run lint:fix
# DB (dbmate)
cd packages/web && bun run db:migrate|db:rollback|db:new <name>|db:status
# Build/Start
bun run --filter @hourly/web build
bun run --filter @hourly/web start
# Tests
bun run --filter @hourly/web test
```
## Architecture (FSD)
- Layers: app → pages → widgets → features → entities → shared
- Rules: only import downward; use barrel `index.ts` APIs; shared utils in `shared`

## Key Patterns
- Auth: dual OAuth (Atlassian, GitLab); merged DB session; routes `auth.$provider.*`
- Data loading: resource routes return JSON for Query; handle auth, clients, pagination
- Infinite queries: `useAutoLoadInfiniteQuery`, `AutoLoadProgress`, `getNextPageParam`
- Worklog sync: idempotent sync strategy (delete existing, create new) in `jira.worklog.entries.tsx` action
- Commit reconciliation: `calculate-worklogs-from-commits` groups commits by day/issue, splits workday
- DB: MikroORM entities (Session, Token, Profile), `orm.em.fork()`, migrations in `db/migrations/`
- API clients: `lib/atlassian/client.ts`, `lib/gitlab/client.ts` with token refresh

## Code Style (Biome)
- Ignore formatting; run `bun run lint:fix` (or `bunx --bun biome check . --write --unsafe`)
- Conventions: no default exports (except routes/config/tests), single quotes, tabs (vw=2), 100 cols, import extensions, kebab-case, `~/` alias
- TS strict; explicit return types for shared utils; domain types/schemas in `app/domain`
- Prefer `undefined` over `null` for “no value” semantics
- Avoid using the `Boolean(...)` constructor for casting; use explicit comparisons instead (e.g. `typeof name === 'string' && name.length > 0`)

## Import Ordering (Required)
Follow eslint-plugin-import order rules. Group imports in this order, separated by blank lines:
1. **Type imports** (`import type { ... } from ...`) - ALL type-only imports first
2. **Node/Bun built-ins** - Built-in modules (e.g., `fs`, `path`)
3. **External modules** - Dependencies from `node_modules` (e.g., `inversify`, `elysia`)
4. **Local imports** - Relative imports from the project (e.g., `../domain/...`)

**Rules:**
- Always use `import type { ... }` syntax, NOT `import { type ... }`
- Never mix value and type imports in the same statement
- Separate groups with blank lines
- Alphabetize within each group
- Value imports use the class/function, type imports use only types/interfaces

**Example:**
```ts
import type { Project } from '../../domain/entities/project.js'
import type { ProjectRepository } from '../../domain/repositories/project-repository.js'

import { injectable, inject } from 'inversify'

import { ValidationError } from '../../../core/errors/validation-error.js'
import { ListProjectsUseCase } from '../use-cases/list-projects-use-case.js'
```

### Dev-safe singleton
```ts
export let connection: ConnectionType

declare const global: { __connection?: typeof connection }
function createConnection(): typeof connection { return new Connection(process.env.CONNECTION_URL ?? '') }
if (process.env.NODE_ENV === 'development') { global.__connection ??= createConnection(); connection = global.__connection }
if (process.env.NODE_ENV !== 'development') { connection = createConnection() }
```
## shadcn/ui
```bash
cd packages/web
bunx --bun shadcn@latest add <component>
```
Post‑gen fixes: files in `app/shared/ui/shadcn/ui` (blocks in `app/shared/ui/shadcn/blocks`); replace `@/lib/utils` → `~/lib/util/index.ts`; ensure named exports; remove `@/` imports.

## Env (.env in packages/web)
- Atlassian: `ATLASSIAN_CLIENT_ID`, `ATLASSIAN_CLIENT_SECRET`, `ATLASSIAN_CALLBACK_URL`
- GitLab: `GITLAB_APPLICATION_ID`, `GITLAB_APPLICATION_SECRET`, `GITLAB_CALLBACK_URL`, `GITLAB_BASE_URL`
- Session: `SESSION_SECRET`

## Testing patterns
- Co‑located tests; Testing Library queries over snapshots; React 19 globals OK
- Jest config: `jest.config.ts`; run with `bun run --filter @hourly/web test`

## Notes
- Route naming: `__.tsx` root layout; `__._index.tsx` nested index; `$provider` params
- Calendar: Uses `react-big-calendar` with drag-and-drop addon; Luxon localizer; custom toolbar/event components
- Sessions: DB‑backed `createSessionStorage` with expiration/cleanup
- OAuth refresh: automatic; refresh tokens in DB; check expiry
- Pagination: cursor/offset; `PAGE_SIZE=100`; infinite queries can auto‑load
- Worklog sync: Idempotent delete/create strategy ensures calendar matches Jira after save

## README
- Keep in sync: validate, update, prune, and sync user‑facing/env sections after changes
