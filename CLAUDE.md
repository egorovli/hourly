# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **working-hours reconciliation tool** that helps reconcile personal GitLab commit activity with Jira issues to automate monthly working-hours allocation. The goal is to map reconciled issues and commits onto a working-month calendar for time distribution.

**Tech Stack:**
- **Runtime:** Bun (workspaces, package manager)
- **Framework:** React Router v7 (SSR-enabled)
- **UI:** React 19, Tailwind CSS 4, shadcn/ui, Radix UI
- **State Management:** TanStack Query v5 (server state)
- **Database:** SQLite with MikroORM 6
- **Authentication:** Remix Auth (OAuth2 for Atlassian/Jira and GitLab)
- **Validation:** Zod 4, Conform
- **Testing:** Jest, Testing Library, Playwright

## Documentation Search Workflow (Mandatory)

**Always use MCP tools for documentation lookup before implementing features or using unfamiliar APIs.**

When you need to understand how to use a library, API, or framework feature:

1. **Context7 MCP** (`mcp__context7__resolve-library-id` → `mcp__context7__get-library-docs`)
   - Primary source for library documentation
   - Example: Resolve "TanStack Query" → Get docs on infinite queries

2. **DDG Search MCP** (`mcp__ddg-search__search`)
   - Web search for articles, guides, and recent updates
   - Example: Search for "shadcn progress component indeterminate state"

3. **Perplexity MCP** (`mcp__perplexity__perplexity_search_web`)
   - AI-powered search with context and recency filters
   - Example: Search with recency="week" for latest best practices

**Why this matters:**
- Ensures implementation follows current best practices
- Prevents using deprecated APIs or patterns
- Reduces bugs from misunderstanding library behavior
- Documents research trail for future developers

**Example workflow:**
```
User: "Add infinite scrolling to the user list"
→ Search Context7 for "TanStack Query infinite queries"
→ Search DDG for "React Router v7 infinite scroll patterns"
→ Read docs on useInfiniteQuery, getNextPageParam
→ Implement with proper pagination handling
```

This workflow was used to implement auto-loading infinite queries with progress indicators in this project.

## Development Commands

### Setup
```bash
# Install all workspace dependencies
bun install

# Set up environment variables (see Authentication section)
# Copy and configure .env in packages/web/
```

### Development
```bash
# Start dev server (http://localhost:3000)
bun run --filter @working-hours/web dev

# Type generation and checking
bun run --filter @working-hours/web check-types

# Linting (Biome)
bun run lint          # Check all files
bun run lint:fix      # Auto-fix issues
```

### Database (dbmate)
```bash
cd packages/web

# Run migrations
bun run db:migrate

# Rollback last migration
bun run db:rollback

# Create new migration
bun run db:new <migration-name>

# Check migration status
bun run db:status
```

### Testing
```bash
# Run Jest test suite
bun run --filter @working-hours/web test
```

### Build
```bash
# Production build
bun run --filter @working-hours/web build

# Start production server
bun run --filter @working-hours/web start
```

## Architecture

### Monorepo Structure
- **Bun workspaces** with all code under `packages/`
- Main application: `packages/web/`

### Application Structure (`packages/web/app/`)
```
app/
├── routes/              # React Router v7 file-based routing
│   ├── __.tsx          # Root layout
│   ├── __._index.tsx   # Main dashboard (nested under layout)
│   ├── auth.$provider.* # OAuth authentication flows
│   ├── jira.*          # Jira data loaders (projects, users, issues, worklog)
│   └── gitlab.*        # GitLab data loaders (projects, contributors, commits)
├── components/
│   ├── shadcn/         # shadcn/ui components
│   └── ui/             # Custom UI components
├── hooks/              # Custom React hooks
├── lib/                # Core libraries
│   ├── atlassian/      # Jira/Atlassian API client
│   ├── gitlab/         # GitLab API client
│   ├── mikro-orm/      # Database entities and ORM
│   ├── session/        # Session storage (database-backed)
│   ├── auth/           # Authentication strategies
│   ├── query/          # TanStack Query utilities
│   └── util/           # Shared utilities
├── domain/             # Business logic, enums, schemas, state machines
└── styles/             # Global CSS and Tailwind utilities
```

### Key Architectural Patterns

#### Authentication Flow
- **Dual OAuth2 providers:** Atlassian (Jira) and GitLab
- **Merged sessions:** Both provider tokens stored in single session
- Session data persisted in SQLite via MikroORM
- Routes: `auth.$provider.sign-in.tsx`, `auth.$provider.callback.tsx`, `auth.$provider.sign-out.tsx`
- Session interface (`SessionUser`) in `lib/session/storage.ts`

#### Data Loading Pattern
- **Resource routes** act as data loaders (e.g., `jira.projects.tsx`, `gitlab.commits.tsx`)
- Return JSON data for TanStack Query consumption
- Loader routes handle authentication, API client creation, pagination
- Main dashboard (`__._index.tsx`) coordinates multiple infinite queries

#### Infinite Queries with Auto-Loading
- Custom hook: `useAutoLoadInfiniteQuery` automatically fetches all pages
- Progress component: `AutoLoadProgress` shows subtle loading indicators
- Used for: worklog entries, Jira issues, GitLab commits, commit-referenced issues
- Pattern: `getNextPageParam` determines pagination continuation

#### Database Access
- **MikroORM entities:** Session, Token, Profile
- Entity Manager forked per request: `orm.em.fork()`
- Migrations managed by dbmate in `db/migrations/`
- Database file: `db/data.db` (SQLite)

#### API Clients
- **Atlassian client** (`lib/atlassian/client.ts`): Jira API v3
- **GitLab client** (`lib/gitlab/client.ts`): GitLab API v4
- Both support automatic token refresh via refresh tokens
- Tokens stored in database, retrieved via session

## Code Style (Biome)

**IMPORTANT: Don't worry about formatting or indentation when writing code.**
- All formatting is automatically applied by running `bun run lint:fix` from the project root
- For unsafe fixes (like `==` to `===`): `bunx --bun biome check . --write --unsafe`
- Focus on logic and correctness - save tokens by ignoring whitespace, quote style, line width, etc.
- Biome will handle indentation, quotes, semicolons, line breaks, and import sorting
- Some warnings (complexity, non-null assertions) may require manual fixes but won't block development

**Key conventions enforced by Biome:**
- **No default exports** (except routes, config files, tests) - use named exports
- **Single quotes** for strings, JSX attributes
- **Tab indentation** (visual width 2)
- **100-character line width**
- **No semicolons** (ASI)
- **Import extensions required** (`.ts`, `.tsx`)
- **File naming:** kebab-case (e.g., `user-summary.card.tsx`)
- **Module alias:** `~/` for imports from `app/` directory

**Type safety:**
- TypeScript strict mode enabled
- Explicit return types for shared utilities
- Keep domain types (enums, Zod schemas) in `app/domain/`

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

This ensures connections are reused during development hot reloads while creating fresh instances in production.

## Adding shadcn/ui Components

```bash
cd packages/web
bunx --bun shadcn@latest add <component-name>
```

**Important post-generation steps:**
- Components are installed to `app/components/shadcn/ui/` (blocks go to `app/components/shadcn/blocks/`)
- **Replace utility imports:** Change `@/lib/utils` to `~/lib/util/index.ts`
- **Ensure named exports:** All component files must use named exports (not default)
- **Verify path alias:** No `@/` imports - use `~/` alias exclusively

Example fix:
```typescript
// ❌ Wrong
import { cn } from '@/lib/utils'
export default function Button() { }

// ✅ Correct
import { cn } from '~/lib/util/index.ts'
export function Button() { }
```

## Schedule-X Calendar Integration

When using the Schedule-X calendar library:

**1. Import base theme CSS** (required for rendering):
```typescript
import '@schedule-x/theme-default/dist/index.css'
```

**2. Create custom theme mapping** to blend with shadcn (`app/styles/schedule-x.css`):
```css
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

**3. Import custom theme** alongside other global styles in your route or root.

Reference: https://schedule-x.dev/docs/calendar/configuration

## Environment Variables

Configure in `packages/web/.env`:

```bash
# Atlassian OAuth2
ATLASSIAN_CLIENT_ID=your-client-id
ATLASSIAN_CLIENT_SECRET=your-client-secret
ATLASSIAN_CALLBACK_URL=http://localhost:3000/auth/atlassian/callback

# GitLab OAuth2
GITLAB_APPLICATION_ID=your-app-id
GITLAB_APPLICATION_SECRET=your-app-secret
GITLAB_CALLBACK_URL=http://localhost:3000/auth/gitlab/callback
GITLAB_BASE_URL=https://gitlab.com  # or self-hosted instance

# Session encryption
SESSION_SECRET=generate-a-random-secret
```

## Testing Patterns

- **Jest** with Testing Library for component/unit tests
- Tests co-located with source: `*.test.ts`, `*.test.tsx`
- Test files exempt from `noDefaultExport` rule
- React 19 globals available in test files

### Dev Login Shortcut (MCP/Browser Testing)

In development mode, bypass OAuth flows for quick authenticated testing:

- Visit `/dev/hijack-session` to assume an existing authenticated session
- Automatically redirects to `/` with valid session cookie
- Picks the most recent fully-authenticated session (both providers)
- Returns 404 if no valid sessions exist (does not create data)
- **Only available when `import.meta.env.DEV` is true**
- Useful for Chrome/Playwright MCP end-to-end testing

## Important Notes

### Route File Naming
- `__.tsx` - Root layout (underscore prefix = pathless layout)
- `__._index.tsx` - Index route nested under layout (dot prefix = same path segment)
- `$provider` - Dynamic route parameter

### Session Management
- Sessions stored in database (not in-memory or cookies)
- Custom session storage implementation using React Router's `createSessionStorage`
- Handles expiration, cleanup, and data serialization

### OAuth Token Refresh
- Both Atlassian and GitLab clients handle automatic token refresh
- Refresh tokens stored securely in database
- Token expiration checked before API calls

### Pagination Strategy
- Most data sources use cursor-based or offset-based pagination
- Page size constant: `PAGE_SIZE = 100`
- Infinite queries automatically load all pages when enabled

## README.md Maintenance

**IMPORTANT: Keep README.md synchronized with actual project features and implementation.**

When implementing new features or making significant changes:

1. **Validate README.md Accuracy**
   - After completing a feature, review the README.md
   - Check if the feature list, architecture, or tech stack needs updating
   - Verify configuration examples match current environment variables
   - Ensure code examples reflect current patterns and APIs

2. **Update Documentation**
   - Add new features to the "Features" section with clear descriptions
   - Update tech stack versions if dependencies changed significantly
   - Add new commands to the "Available Commands" section
   - Update architecture diagrams or descriptions if data flow changed
   - Add troubleshooting entries for common issues you encountered

3. **Keep It Fresh**
   - Remove deprecated features or obsolete instructions
   - Update screenshots or examples if UI changed
   - Verify all links are still valid
   - Ensure setup instructions work for new developers

4. **User-Facing Changes**
   - If you add user preferences, update the "User Preferences" section
   - If you change OAuth scopes, update the setup guides
   - If you modify environment variables, update the .env examples

The README is the first impression for new developers - treat it as critical documentation that must stay accurate and helpful.
