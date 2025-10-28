# Repository Guide (Concise)

## Structure
- Bun workspaces under `packages/`; app lives in `packages/web`
- React Router v7 file routes in `app/routes`; shared UI in `app/components`; domain in `app/domain`
- Entries: `app/entry.client.tsx`, `app/entry.server.tsx`; global styles in `app/styles`; public assets in `public`

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

### Dev login shortcut (dev only)
- Visit `/dev/hijack-session` → sets `session` cookie; redirects `/`; picks latest fully-auth session; 404 if none

## Commits & PRs
- Conventional Commits; PRs: brief summary, tests (`bun run lint && bun run --filter @hourly/web test`), link tickets; wait green CI
## Automation Vision (high level)
- Reconcile GitLab commits with Jira issues → monthly hours
- Auth: Atlassian + GitLab via Remix Auth; merged session
- Pipeline: filter commits (branch/Jira keys), fetch Jira issue data, stage for distribution

## shadcn/ui in this repo
- Run CLI from `packages/web`:
```bash
cd packages/web
bunx --bun shadcn@latest add button card input label separator field dropdown-menu popover select command calendar tooltip sheet breadcrumb badge avatar skeleton
```
- Files in `app/components/shadcn/ui` (blocks: `app/components/shadcn/blocks`)
- Replace `@/lib/utils` → `~/lib/util/index.ts`; ensure named exports; no `@/` paths

## Schedule-X calendar
- Import base CSS once: `import '@schedule-x/theme-default/dist/index.css'`
- Add theme map `app/styles/schedule-x.css`:
```css
:root{--sx-color-primary:hsl(var(--primary));--sx-color-on-primary:hsl(var(--primary-foreground));--sx-color-surface:hsl(var(--card));--sx-color-on-surface:hsl(var(--foreground));--sx-color-outline:hsl(var(--border))}
.dark{--sx-color-surface:hsl(var(--card));--sx-color-on-surface:hsl(var(--foreground))}
```
- Prefer user locale/timezone; see docs
- Range picker in Filters: use shadcn `calendar`, `popover`, `button`, `input`, `command`

## README maintenance
- Keep README in sync: validate, update features/commands/architecture, prune obsolete, sync env and user-facing changes
