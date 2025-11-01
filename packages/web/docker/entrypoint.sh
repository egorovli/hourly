#!/bin/sh
set -eu

# Production-ready Docker entrypoint script
# Runs database migrations before starting the web application

log() {
	echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" >&2
}

log_error() {
	echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
}

# Check if DATABASE_URL is set
if [ -z "${DATABASE_URL:-}" ]; then
	log_error "DATABASE_URL environment variable is not set"
	exit 1
fi

# Change to web package directory where migrations are located
cd /app/packages/web || {
	log_error "Failed to change directory to /app/packages/web"
	exit 1
}

# Set dbmate migrations directory (relative to current directory)
export DBMATE_MIGRATIONS_DIR="./db/migrations"

# Run database migrations
log "Running database migrations..."
if ! bunx --bun dbmate@latest up; then
	log_error "Database migration failed"
	exit 1
fi

log "Database migrations completed successfully"

# Return to app root for starting the application
cd /app || {
	log_error "Failed to change directory to /app"
	exit 1
}

# Start the web application
log "Starting web application..."
exec bun run --filter "@hourly/web" start "$@"

