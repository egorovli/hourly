# Repository Guidelines

## Project Structure & Module Organization
The workspace uses Bun workspaces with code under `packages/`. The web app lives in `packages/web` and follows React Router v7 file-based routing: route files sit in `packages/web/app/routes`, shared UI lives in `packages/web/app/components`, and domain logic in `packages/web/app/domain`. Client and server entries are `packages/web/app/entry.client.tsx` and `packages/web/app/entry.server.tsx`. Global styles and Tailwind directives live in `packages/web/app/styles`, while reusable types live in `packages/web/types`. Public assets are served from `packages/web/public`.

## Documentation Search Protocol (Required)

**Before implementing any feature using unfamiliar libraries or APIs, search for documentation using these MCP tools:**

1. **Context7 MCP** - Library-specific documentation (resolve library ID first, then fetch docs with optional topic filter)
2. **DDG Search MCP** - Web search for tutorials, guides, stack overflow threads, and community resources
3. **Perplexity MCP** - AI-augmented search with recency filters (day/week/month/year) for latest patterns and best practices

**Rationale:** This ensures code follows current best practices, avoids deprecated patterns, and documents the research process for future maintainers. Use all three sources when exploring new territory; cross-reference findings before committing to an implementation approach.

**Example:** When adding infinite scroll, search Context7 for "TanStack Query useInfiniteQuery", DDG for "React Router v7 infinite queries pagination", and Perplexity with recency="month" for "React infinite scroll auto-load patterns 2025".

## Build, Test, and Development Commands
Run `bun install` from the repo root to sync dependencies. Use `bun run --filter @working-hours/web dev` for the local server at http://localhost:3000 with SSR enabled. Build production bundles with `bun run --filter @working-hours/web build`, and generate type output with `bun run --filter @working-hours/web check-types`. Static analysis runs through Biome via `bun run lint` or `bun run lint:fix`.

## Coding Style & Naming Conventions

**Don't waste tokens on formatting.** All code formatting is automatically handled by `bun run lint:fix` from the project root (or `bunx --bun biome check . --write --unsafe` for unsafe fixes like `==` to `===`). Ignore indentation, quote style, line width, and whitespace when writing code - focus only on logic and correctness.

Biome enforces single quotes, tab indentation (visual width 2), 100 character lines, and a strong preference for named exports (`noDefaultExport`). React files use the `~/` alias for modules under `app/`. Co-locate UI-specific hooks and components beside their routes, name files with kebab-case (e.g., `user-summary.card.tsx`), and keep Tailwind utility classes in `global.css` or `app/styles`. TypeScript is strict; prefer explicit return types for shared utilities and keep enums, zod schemas, and XState machines in `packages/web/app/domain`.

### Singleton Pattern for Connections
When creating singleton-like objects (database connections, caches, external service clients), use the global object pattern to survive hot reloads in development:

```typescript
export let connection: ConnectionType

declare const global: {
  __connection?: typeof connection
}

function createConnection(): typeof connection {
  return new Connection(process.env.CONNECTION_URL ?? '')
}

if (process.env.NODE_ENV === 'development') {
  global.__connection ??= createConnection()
  connection = global.__connection
}

if (process.env.NODE_ENV !== 'development') {
  connection = createConnection()
}
```

This pattern ensures connections are reused during development hot reloads while creating fresh instances in production. See [packages/web/app/lib/db/connection.ts](packages/web/app/lib/db/connection.ts) for a complete example with DuckDB.

## Testing Guidelines
Unit and integration tests run with Jest and Testing Library (`bun run --filter @working-hours/web test`). Place specs alongside the feature as `*.test.tsx` or inside `__tests__` when covering multiple modules. Use `@testing-library/react` queries over snapshots, and hydrate React Router loaders with representative fixtures. Target meaningful coverage on business-critical routes; add coverage thresholds via `jest.config.ts` if metrics slip.

### Dev login shortcut for MCP/browser testing

In development, you can quickly assume an authenticated session without going through OAuth flows:

- Visit `/dev/hijack-session` to set a valid `session` cookie and be redirected to `/`.
- The route will pick the most recent fully-authenticated session (both providers). If none exist, it responds with 404 and does not create any data.
- This works well with Chrome/Playwright MCP for end-to-end testing.

Note: This route is only available when `import.meta.env.DEV` is true.

## Commit & Pull Request Guidelines
Git history is not bundled in this workspace; follow Conventional Commits (`feat:`, `fix:`, `docs:`) so automation can infer change scope. Start PR descriptions with a one-sentence summary, list testing evidence (`Tests: bun run lint && bun run --filter @working-hours/web test`), and link tracking tickets. Include screenshots or screencasts when UI changes affect routes. Request review from domain owners and wait for green CI before merging.

## Automation Vision
- Goal: build a service that reconciles personal commit activity with Jira issues to automate monthly working-hours allocation.
- Authentication: require Atlassian (Jira) OAuth2 for issue metadata and GitLab OAuth2 for commit history; both flows now handled via Remix Auth with provider-specific session merging.
- Data Pipeline: filter GitLab commits by agreed criteria (e.g., branch naming, Jira keys in messages), fetch linked Jira issue details (summary, description, status), and stage them for time distribution.
- Workload Distribution: design rules to map issues/commits onto the working-month calendar, producing shareable reports or automated time entries.
- Next Steps: capture commit filtering rules, define Jira project scopes, and prototype a scheduler that translates reconciled issues into hours.
- UI Toolkit: shadcn/ui components live in `packages/web/app/components/shadcn`; add new pieces via `bunx --bun shadcn@latest add <component>` (e.g., `bunx --bun shadcn@latest add button`).
- Run shadcn CLI commands from the `packages/web` directory so components.json is detected and files land in the right workspace.

## shadcn/ui in this repository

- Always run the CLI from `packages/web`:

  ```bash
  cd packages/web
  bunx --bun shadcn@latest add button card input label separator field dropdown-menu popover select command calendar tooltip sheet breadcrumb badge avatar skeleton
  ```

- File layout and imports differ from the default shadcn templates:
  - Components are generated under `app/components/shadcn/ui` (and `app/components/shadcn/blocks` for blocks).
  - Replace the default utility import with our alias: use `import { cn } from '~/lib/util/index.ts'` instead of `@/lib/utils`.
  - Prefer named exports only (Biome `noDefaultExport`).
  - Keep styling consistent with our existing components and Tailwind tokens in `app/styles`.

- After generation, skim diffs and normalize:
  - Ensure all component files use named exports.
  - Ensure `cn` comes from `~/lib/util/index.ts`.
  - Verify paths do not use `@/` and conform to our `~/` alias.

## Schedule-X calendar theming and integration

- Base theme CSS must be included for the calendar to render correctly:

  ```ts
  // Import once (route or at app root)
  import '@schedule-x/theme-default/dist/index.css'
  ```

- To visually blend with shadcn, map Schedule-X CSS variables to our shadcn tokens. Create `app/styles/schedule-x.css` and import it near other global styles:

  ```css
  /* app/styles/schedule-x.css */
  :root {
    --sx-color-primary: hsl(var(--primary));
    --sx-color-on-primary: hsl(var(--primary-foreground));
    --sx-color-surface: hsl(var(--card));
    --sx-color-on-surface: hsl(var(--foreground));
    --sx-color-outline: hsl(var(--border));
  }

  .dark {
    --sx-color-surface: hsl(var(--card));
    --sx-color-on-surface: hsl(var(--foreground));
  }
  ```

- When instantiating the calendar, follow the docs and prefer our locale/timezone from user preferences. Reference: https://schedule-x.dev/docs/calendar/configuration

- For a range date picker (2 months visible) in the Filters section, install and use shadcn `calendar`, `popover`, `button`, `input`, and `command` (for typeahead) components as needed; keep functionality separated from the UI scaffold.
