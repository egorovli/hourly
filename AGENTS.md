# Repository Guide (Concise)

## Structure
- Bun workspaces under `packages/`; app lives in `packages/web`
- React Router v7 file routes in `app/routes`; shared UI in `app/components`; domain in `app/domain`
- Entries: `app/entry.client.tsx`, `app/entry.server.tsx`; global styles in `app/styles`; public assets in `public`

## Serena MCP Project Activation (Required)
- **Always activate Serena MCP project at the start of new agent interactions** (if not already activated)
- Use `mcp_serena_activate_project` with project name `'egorovli/hourly'` or project path
- Check activation status with `mcp_serena_get_current_config` if unsure
- Serena provides semantic coding tools for efficient code exploration and editing

## Documentation Search (Required)
Before using unfamiliar libs/APIs, consult all three and cross‑reference:
1) Context7 MCP → resolve library → fetch docs (optionally by topic)
2) DDG Search MCP → tutorials/guides/StackOverflow
3) Perplexity MCP → AI search with recency (day/week/month/year)
Example: infinite scroll → Context7 "TanStack Query useInfiniteQuery"; DDG "React Router v7 infinite"; Perplexity recency="month".

## Commands
- Install: `bun install`
- Dev server (SSR, :3000): `bun run --filter @hourly/web dev`
- Build/types: `bun run --filter @hourly/web build` · `bun run --filter @hourly/web types:check`
- Lint: `bun run lint` · `bun run lint:fix`
## Code Style
- Save tokens: ignore formatting; run `bun run lint:fix` (or `bunx --bun biome check . --write --unsafe`)
- Biome: single quotes, tabs (vw=2), 100 cols, named exports (no default), `~/` alias, kebab-case filenames
- TS strict; prefer explicit return types for shared utils; keep enums/zod/XState in `app/domain`
- Prefer `undefined` over `null` throughout the codebase
- Avoid `Boolean(value)` casts; prefer explicit checks like `typeof value === 'string' && value.length > 0`

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

## Testing & Validation
- **Always run after making changes**: `bun run lint:fix` and `bun run --filter @hourly/web types:check`
- These commands must pass before considering changes complete
- Lint fixes formatting and catches common issues
- Type check ensures TypeScript compilation succeeds

### Connection singletons (dev-safe)
```ts
export let connection: ConnectionType

declare const global: { __connection?: typeof connection }
function createConnection(): typeof connection { return new Connection(process.env.CONNECTION_URL ?? '') }
if (process.env.NODE_ENV === 'development') { global.__connection ??= createConnection(); connection = global.__connection }
if (process.env.NODE_ENV !== 'development') { connection = createConnection() }
```

## Testing
- Jest + Testing Library: `bun run --filter @hourly/web test`
- Co-locate `*.test.tsx` or use `__tests__/`; prefer queries over snapshots

## Automation Vision (high level)
- Reconcile GitLab commits with Jira issues → monthly hours
- Auth: Atlassian + GitLab via Remix Auth; merged session
- Pipeline: filter commits (branch/Jira keys), fetch Jira issue data, stage for distribution
- Worklog sync: Idempotent delete/create strategy in `jira.worklog.entries.tsx` action
- Commit reconciliation: `calculate-worklogs-from-commits` groups by day/issue, splits workday

## shadcn/ui in this repo
- Run CLI from `packages/web`:
```bash
cd packages/web
bunx --bun shadcn@latest add button card input label separator field dropdown-menu popover select command calendar tooltip sheet breadcrumb badge avatar skeleton
```
- Files in `app/shared/ui/shadcn/ui` (blocks: `app/shared/ui/shadcn/blocks`)
- Replace `@/lib/utils` → `~/lib/util/index.ts`; ensure named exports; no `@/` paths

## Calendar (react-big-calendar)
- Uses `react-big-calendar` with drag-and-drop addon (`react-big-calendar/lib/addons/dragAndDrop`)
- Luxon localizer: `luxonLocalizer(DateTime)` from `react-big-calendar`
- Custom styles: `app/styles/react-big-calendar.css`
- Custom components: toolbar, event content, context menus
- Views: month, week (day/agenda not currently used)
- Drag-and-drop: events can be resized, moved, duplicated (Alt/Option key)
- External drag: issues from search panel can be dropped onto calendar

## README maintenance
- Keep README in sync: validate, update features/commands/architecture, prune obsolete, sync env and user-facing changes
