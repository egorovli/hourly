# Repository Guidelines

## Project Structure & Module Organization
The workspace uses Bun workspaces with code under `packages/`. The web app lives in `packages/web` and follows React Router v7 file-based routing: route files sit in `packages/web/app/routes`, shared UI lives in `packages/web/app/components`, and domain logic in `packages/web/app/domain`. Client and server entries are `packages/web/app/entry.client.tsx` and `packages/web/app/entry.server.tsx`. Global styles and Tailwind directives live in `packages/web/app/styles`, while reusable types live in `packages/web/types`. Public assets are served from `packages/web/public`.

## Build, Test, and Development Commands
Run `bun install` from the repo root to sync dependencies. Use `bun run --filter @working-hours/web dev` for the local server at http://localhost:3000 with SSR enabled. Build production bundles with `bun run --filter @working-hours/web build`, and generate type output with `bun run --filter @working-hours/web check-types`. Static analysis runs through Biome via `bun run lint` or `bun run lint:fix`.

## Coding Style & Naming Conventions
Biome enforces single quotes, tab indentation (visual width 2), 100 character lines, and a strong preference for named exports (`noDefaultExport`). React files use the `~/` alias for modules under `app/`. Co-locate UI-specific hooks and components beside their routes, name files with kebab-case (e.g., `user-summary.card.tsx`), and keep Tailwind utility classes in `global.css` or `app/styles`. TypeScript is strict; prefer explicit return types for shared utilities and keep enums, zod schemas, and XState machines in `packages/web/app/domain`.

## Testing Guidelines
Unit and integration tests run with Jest and Testing Library (`bun run --filter @working-hours/web test`). Place specs alongside the feature as `*.test.tsx` or inside `__tests__` when covering multiple modules. Use `@testing-library/react` queries over snapshots, and hydrate React Router loaders with representative fixtures. Target meaningful coverage on business-critical routes; add coverage thresholds via `jest.config.ts` if metrics slip.

## Commit & Pull Request Guidelines
Git history is not bundled in this workspace; follow Conventional Commits (`feat:`, `fix:`, `docs:`) so automation can infer change scope. Start PR descriptions with a one-sentence summary, list testing evidence (`Tests: bun run lint && bun run --filter @working-hours/web test`), and link tracking tickets. Include screenshots or screencasts when UI changes affect routes. Request review from domain owners and wait for green CI before merging.
