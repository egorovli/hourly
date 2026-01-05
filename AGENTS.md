# Repository Guide (Concise)

## Structure
- Bun workspaces under `packages/`; app lives in `packages/web`
- React Router v7 file routes in `app/routes`; shared UI in `app/components`; domain in `app/domain`
- Entries: `app/entry.client.tsx`, `app/entry.server.tsx`; global styles in `app/styles`; public assets in `public`

## Serena MCP Project Activation (Required)
- **Always activate Serena MCP project at the start of new agent interactions** (if not already activated)
- Use `mcp_serena_activate_project` with project name `'hourly'`
- Check activation status with `mcp_serena_get_current_config` if unsure
- Serena provides semantic coding tools for efficient code exploration and editing

## Documentation Search (Required)
Before using unfamiliar libs/APIs, use Context7 MCP:
- Context7 MCP → resolve library → fetch docs (optionally by topic)
- Example: infinite scroll → Context7 "TanStack Query useInfiniteQuery"

## Commands
- Install: `bun install`
- Dev server (SSR, :3000): `bun run --filter @hourly/web dev`
- Build/types: `bun run --filter @hourly/web build` · `bun run --filter @hourly/web types:check`
- Lint: `bun run --filter @hourly/web lint` · `bun run --filter @hourly/web lint:fix`

## Code Style
- Save tokens: ignore formatting; run `bun run --filter @hourly/web lint:fix` (or `bunx --bun biome check . --write --unsafe`)
- Biome: single quotes, tabs (vw=2), 100 cols, named exports (no default), `~/` alias, kebab-case filenames
- TS strict; prefer explicit return types for shared utils; keep enums/zod in `app/domain`
- Prefer `undefined` over `null` throughout the codebase
- Avoid `Boolean(value)` casts; prefer explicit checks like `typeof value === 'string' && value.length > 0`

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

## Testing & Validation
- **Always run after making changes**: `bun run --filter @hourly/web lint:fix` and `bun run --filter @hourly/web types:check`
- These commands must pass before considering changes complete
- Lint fixes formatting and catches common issues
- Type check ensures TypeScript compilation succeeds

### Connection singletons (dev-safe)
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

## Testing
- Infrastructure ready (Jest + Testing Library); no tests written yet
- Run: `bun run --filter @hourly/web test`
- Co-locate `*.test.tsx` files; prefer Testing Library queries over snapshots

## Automation Vision (high level)
- Reconcile GitLab commits with Jira issues → monthly hours
- Auth: Atlassian + GitLab via Remix Auth; merged session
- Pipeline: filter commits (branch/Jira keys), fetch Jira issue data, stage for distribution
- Worklog sync: Idempotent delete/create strategy in `api.worklog.entries.tsx` action

## shadcn/ui in this repo
- Run CLI from `packages/web`:
```bash
cd packages/web
bunx --bun shadcn@latest add button card input label separator field dropdown-menu popover select command calendar tooltip sheet breadcrumb badge avatar skeleton
```
- Files in `app/components/shadcn/ui` (blocks: `app/components/shadcn/blocks`)
- Replace `@/lib/utils` → `~/lib/util/index.ts`; ensure named exports; no `@/` paths

## Calendar (FullCalendar)
- Uses `@fullcalendar/react` v6 with `@fullcalendar/timegrid` and `@fullcalendar/interaction`
- Lazy-loaded for performance; plugins dynamically imported
- Custom components: toolbar, event content
- Views: week (timeGridWeek)
- Drag-and-drop: events can be resized, moved
- External drag: issues from search panel can be dropped onto calendar

## README maintenance
- Keep README in sync: validate, update features/commands/architecture, prune obsolete, sync env and user-facing changes
