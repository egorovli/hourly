# Troubleshooting

Common issues and their solutions when working with this project.

## Build & Type Check Issues

### esbuild Error on `bun run types:check`

**Error:**
```
failed to load config from /Users/.../vite.config.ts
Error: The service was stopped: write EPIPE
```

**Solution:**
```bash
$ pkill esbuild
$ bun install --force
```

This reinstalls all dependencies and often resolves esbuild-related issues caused by corrupted or stale builds.

## Development Server Issues

### Port Already in Use

If the dev server fails to start with "port already in use":
```bash
# Find and kill the process using the port
lsof -ti:5173 | xargs kill -9
# Or use a different port
PORT=5174 bun run --filter @hourly/web dev
```

## Database Issues

### Migration Failures

If migrations fail, check the current status:
```bash
cd packages/web
bun run db:status
```

To rollback the last migration:
```bash
bun run db:rollback
```

### Database Locked

If you get "database is locked" errors:
1. Stop all running dev servers
2. Delete the database file and re-run migrations (dev only)
3. Restart the dev server

## OAuth & Authentication Issues

### Token Refresh Failures

If you're getting 401 errors after a period of inactivity:
1. Check that refresh tokens are properly stored in the database
2. Visit `/dev/hijack-session` (dev only) to use the latest valid session
3. Re-authenticate with the provider if needed

### Missing Scopes

If API calls fail with permission errors, verify OAuth scopes in:
- `ATLASSIAN_CLIENT_ID` configuration in Atlassian Developer Console
- `GITLAB_APPLICATION_ID` configuration in GitLab Application Settings

## Type Errors

### Sudden Type Errors After Dependency Updates

After updating dependencies, regenerate types:
```bash
bun run --filter @hourly/web types:check
```

If that fails with esbuild errors, try:
```bash
bun install --force
bun run --filter @hourly/web types:check
```

### React Router Type Generation Issues

If route types are missing or stale:
```bash
cd packages/web
bunx react-router typegen
```

## Linting Issues

### Biome Formatting Conflicts

Don't manually format code. Always use:
```bash
bun run lint:fix
```

Or for more aggressive fixes:
```bash
bunx --bun biome check . --write --unsafe
```

## Performance Issues

### Slow Queries

Enable query logging in development by checking MikroORM configuration in `packages/web/app/lib/orm/index.ts`.

### Memory Issues

If the dev server crashes with out-of-memory errors:
```bash
NODE_OPTIONS="--max-old-space-size=4096" bun run --filter @hourly/web dev
```

## Getting More Help

If the issue persists:
1. Check recent changes in git history: `git log --oneline -10`
2. Review error logs carefully for stack traces
3. Try starting from a clean state: `rm -rf node_modules && bun install`
4. Check if the issue is reproducible in a fresh clone
