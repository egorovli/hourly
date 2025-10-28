# syntax=docker/dockerfile:1.7

# Build arguments
ARG BUN_VERSION=1.2.23
ARG NODE_ENV=production
ARG VERSION=dev

# ============================================================================
# Base stage: Set up workspace structure
# ============================================================================
FROM oven/bun:${BUN_VERSION}-slim AS base

WORKDIR /app

# Copy package files for dependency resolution
COPY package.json bun.lock ./
COPY packages/web/package.json ./packages/web/

# ============================================================================
# Dependencies stage: Install production dependencies
# ============================================================================
FROM base AS deps-production

WORKDIR /app

# Install production dependencies with caching
RUN --mount=type=cache,target=/root/.bun/install/cache \
	bun install \
	--frozen-lockfile \
	--production \
	--no-save \
	--ignore-scripts

# ============================================================================
# Dependencies stage: Install all dependencies (for build)
# ============================================================================
FROM base AS deps-development

WORKDIR /app

# Install all dependencies (including dev) with caching
RUN --mount=type=cache,target=/root/.bun/install/cache \
	bun install \
	--frozen-lockfile \
	--no-save \
	--ignore-scripts

# ============================================================================
# Builder stage: Build the application
# ============================================================================
FROM deps-development AS builder

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV CI=true

WORKDIR /app

# Copy source code
COPY . .

RUN ls -lah .
RUN ls -lah ./packages/web
# Build the web application
RUN bun run --filter "@hourly/web" build

# ============================================================================
# Runtime stage: Final production image
# ============================================================================
FROM oven/bun:${BUN_VERSION}-slim AS web

# Set production environment and version
ARG NODE_ENV=production
ARG VERSION=dev
ENV NODE_ENV=${NODE_ENV}
ENV HOST=0.0.0.0
ENV PORT=3000
ENV VERSION=${VERSION}

# Set labels for image metadata
LABEL maintainer="Anton Egorov <anton@egorov.io>"
LABEL org.opencontainers.image.title="Hourly Web"
LABEL org.opencontainers.image.description="GitLab commits ↔ Jira issues → monthly hours reconciliation"
LABEL org.opencontainers.image.vendor="Hourly"
LABEL org.opencontainers.image.authors="Anton Egorov <anton@egorov.io>"
LABEL org.opencontainers.image.version="${VERSION}"

WORKDIR /app

# Copy production dependencies
COPY --from=deps-production --chown=bun:bun /app/package.json ./package.json
COPY --from=deps-production --chown=bun:bun /app/node_modules ./node_modules
COPY --from=deps-production --chown=bun:bun /app/packages/web/package.json ./packages/web/package.json

# Copy built application
COPY --from=builder --chown=bun:bun /app/packages/web/build ./packages/web/build

# Copy necessary config files for runtime
COPY --from=builder --chown=bun:bun \
	/app/packages/web/react-router.config.ts \
	/app/packages/web/tsconfig.json \
	/app/packages/web/vite.config.ts \
	./packages/web/

# Security: Run as non-root user (bun user is already created in base image)
USER bun

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
	CMD bun run --bun --cwd /app/packages/web -e "fetch('http://localhost:3000').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the application
CMD ["bun", "run", "--filter", "@hourly/web", "start"]
