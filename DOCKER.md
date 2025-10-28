# Docker Setup Guide

Production-ready Docker configuration for the Hourly application with security best practices and optimized builds.

## Quick Start

### Building locally

```bash
# Build the image
docker build -t hourly-web:local .

# Run the container
docker run -p 3000:3000 --env-file packages/web/.env hourly-web:local
```

### Using the pre-built image

```bash
# Pull from GitHub Container Registry
docker pull ghcr.io/egorovli/working-hours/web:latest

# Run the container
docker run -p 3000:3000 --env-file packages/web/.env ghcr.io/egorovli/working-hours/web:latest
```

## Architecture

### Multi-Stage Build Strategy

The Dockerfile uses a multi-stage build approach with 5 distinct stages:

1. **base** - Sets up workspace structure and copies package manifests
2. **deps-production** - Installs only production dependencies (optimized for final image)
3. **deps-development** - Installs all dependencies including devDependencies (needed for build)
4. **builder** - Compiles and builds the application using React Router
5. **runtime** - Minimal production image with only necessary files

### Image Size Optimization

- **Slim base image**: Uses `oven/bun:1.2.23-slim` (minimal Debian-based image)
- **Multi-stage separation**: Build tools and dev dependencies excluded from final image
- **Layer caching**: Dependencies cached separately from application code
- **Production dependencies only**: Final image contains only runtime requirements

Expected final image size: **~200-300MB** (compared to 1GB+ without optimization)

## Security Features

### Built-in Security

- ✅ **Non-root user**: Runs as `bun` user (UID 1000, GID 1000)
- ✅ **Minimal attack surface**: Only production dependencies and compiled code
- ✅ **No secrets in image**: Environment variables must be provided at runtime
- ⚠️ **Vulnerability scanning**: Trivy currently disabled (can be re-enabled in workflow)
- ✅ **SBOM generation**: Software Bill of Materials for supply chain security
- ✅ **Provenance attestations**: Build provenance for image verification

### Security Best Practices Applied

1. **Image Signing**: Build pipeline generates provenance and SBOM attestations
2. **Layer Caching**: BuildKit cache with `mode=max` for optimal security and speed
3. **Read-only filesystem ready**: Application designed to work with read-only root
4. **Health checks**: Built-in health check endpoint for container orchestration
5. **No secrets in build**: Uses BuildKit secret mounts if credentials needed

## CI/CD Pipeline

### GitHub Actions Workflow

Location: `.github/workflows/build.yml`

#### Triggers

- Push to `main` branch
- Release published
- Manual workflow dispatch

#### Build Process

1. **Setup**: QEMU for multi-platform, Buildx for advanced features
2. **Version Extract**: Determines version from git tag or commit SHA
3. **Build**: Create Docker image with version metadata
4. **Push**: Multi-platform build (linux/amd64, linux/arm64) and push to GHCR

**Note**: Trivy vulnerability scanning is currently disabled in the workflow.

The version extraction logic:
- **Release event**: Uses `github.event.release.tag_name` (strips `v` prefix)
- **Tag push**: Uses tag name from `github.ref_name` (strips `v` prefix)
- **Other events**: Uses first 7 characters of commit SHA

#### Security Scanning

- **Trivy**: Currently disabled (commented out in workflow)
  - Can be re-enabled by uncommenting the Trivy steps in `.github/workflows/build.yml`
  - When enabled: Scans for vulnerabilities, secrets, and misconfigurations
  - SARIF results can be uploaded to GitHub Security tab

### Action Versions (Latest as of October 2025)

- `actions/checkout@v5` (uses Node.js 24, requires runner v2.327.1+)
- `docker/setup-qemu-action@v3.6.0`
- `docker/setup-buildx-action@v3.11.1`
- `docker/login-action@v3.6.0`
- `docker/metadata-action@v5.8.0`
- `docker/build-push-action@v6.18.0`
- ~~`aquasecurity/trivy-action@0.33.1`~~ (disabled)
- ~~`github/codeql-action/upload-sarif@v4`~~ (disabled)

## Environment Variables

### Required Runtime Variables

```bash
# Session
SESSION_SECRET=<random-secret-string>

# Atlassian OAuth
ATLASSIAN_CLIENT_ID=<client-id>
ATLASSIAN_CLIENT_SECRET=<client-secret>
ATLASSIAN_CALLBACK_URL=<callback-url>

# GitLab OAuth
GITLAB_APPLICATION_ID=<app-id>
GITLAB_APPLICATION_SECRET=<app-secret>
GITLAB_CALLBACK_URL=<callback-url>
GITLAB_BASE_URL=<gitlab-url>
```

### Optional Variables

```bash
# Server Configuration
HOST=0.0.0.0
PORT=3000
NODE_ENV=production
```

### Build-time Variables (Docker ARG)

These are set during the Docker build process, not at runtime:

```bash
# Bun runtime version
BUN_VERSION=1.2.23

# Application version (auto-set in GitHub Actions)
# - For releases: tag name (e.g., "1.2.3", "v1.2.3" → "1.2.3")
# - For commits: short SHA (e.g., "a1b2c3d")
# - Default: "dev"
VERSION=dev
```

The `VERSION` argument is automatically set in GitHub Actions:
- **Release builds**: Uses the git tag (e.g., `v1.2.3` → `1.2.3`)
- **Commit builds**: Uses short commit SHA (first 7 characters)
- **Manual builds**: Defaults to `dev` if not specified

The version is:
- Set as `ENV VERSION` in the container
- Added to image labels as `org.opencontainers.image.version`
- Visible in build summaries and container metadata

## Docker Compose Example

```yaml
version: '3.8'

services:
  web:
    image: ghcr.io/egorovli/working-hours/web:latest
    ports:
      - '3000:3000'
    environment:
      - SESSION_SECRET=${SESSION_SECRET}
      - ATLASSIAN_CLIENT_ID=${ATLASSIAN_CLIENT_ID}
      - ATLASSIAN_CLIENT_SECRET=${ATLASSIAN_CLIENT_SECRET}
      - ATLASSIAN_CALLBACK_URL=${ATLASSIAN_CALLBACK_URL}
      - GITLAB_APPLICATION_ID=${GITLAB_APPLICATION_ID}
      - GITLAB_APPLICATION_SECRET=${GITLAB_APPLICATION_SECRET}
      - GITLAB_CALLBACK_URL=${GITLAB_CALLBACK_URL}
      - GITLAB_BASE_URL=${GITLAB_BASE_URL}
    volumes:
      - ./data:/app/packages/web/data
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## Advanced Usage

### Custom Build Arguments

```bash
# Use specific Bun version
docker build --build-arg BUN_VERSION=1.2.23 -t hourly-web:custom .

# Set custom version
docker build --build-arg VERSION=1.2.3 -t hourly-web:v1.2.3 .

# Build with commit SHA as version
docker build --build-arg VERSION=$(git rev-parse --short HEAD) -t hourly-web:latest .

# Build for specific platform
docker build --platform linux/arm64 -t hourly-web:arm64 .
```

### BuildKit Cache Management

```bash
# Build with inline cache
docker buildx build \
  --cache-from type=registry,ref=ghcr.io/egorovli/working-hours/web:buildcache \
  --cache-to type=registry,ref=ghcr.io/egorovli/working-hours/web:buildcache,mode=max \
  -t hourly-web:cached .
```

### Multi-Platform Build

```bash
# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ghcr.io/egorovli/working-hours/web:multi \
  --push .
```

## Accessing Version Information

### At Runtime

The version is available as an environment variable inside the container:

```bash
# Check version in running container
docker exec <container-id> env | grep VERSION

# Or using docker inspect
docker inspect <container-id> | jq -r '.[0].Config.Env[] | select(startswith("VERSION="))'
```

### From Image Labels

The version is also stored in image metadata:

```bash
# View all labels
docker inspect <image-name> | jq -r '.[0].Config.Labels'

# Get just the version label
docker inspect <image-name> | jq -r '.[0].Config.Labels["org.opencontainers.image.version"]'

# Or using docker inspect format
docker inspect --format='{{index .Config.Labels "org.opencontainers.image.version"}}' <image-name>
```

### In Application Code

Access the version in your application:

```typescript
// In Node.js/Bun
const version = process.env.VERSION || 'unknown';
console.log(`Application version: ${version}`);

// In React Router loader or action
export function loader() {
  return json({
    version: process.env.VERSION,
    // ... other data
  });
}
```

## Troubleshooting

### Build Issues

**Problem**: Dependencies failing to install

```bash
# Clear BuildKit cache
docker buildx prune -af

# Rebuild without cache
docker build --no-cache -t hourly-web:fresh .
```

**Problem**: Out of disk space

```bash
# Remove unused Docker resources
docker system prune -af --volumes
```

### Runtime Issues

**Problem**: Health check failing

```bash
# Check logs
docker logs <container-id>

# Verify port binding
docker ps

# Test health endpoint manually
docker exec <container-id> curl -f http://localhost:3000
```

**Problem**: Environment variables not loading

```bash
# Verify env vars are passed
docker exec <container-id> env | grep ATLASSIAN

# Run with explicit env vars
docker run -e SESSION_SECRET=test -e ... hourly-web:local
```

**Problem**: Need to check image version

```bash
# From image labels
docker inspect hourly-web:local | jq -r '.[0].Config.Labels["org.opencontainers.image.version"]'

# From running container
docker exec <container-id> printenv VERSION

# Or check logs on startup (if your app logs the version)
docker logs <container-id> | grep -i version
```

## Security Scanning Locally

### Re-enabling Trivy in Workflow

Trivy scanning is currently commented out in the workflow. To re-enable:

1. Open `.github/workflows/build.yml`
2. Uncomment the three Trivy-related steps (lines ~120-150)
3. Commit and push the changes

### Manual Trivy Scan

You can still scan images locally:

```bash
# Install Trivy
brew install aquasecurity/trivy/trivy  # macOS
# or
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

# Scan local image
trivy image hourly-web:local

# Scan with specific severity
trivy image --severity HIGH,CRITICAL hourly-web:local

# Generate report
trivy image --format json --output report.json hourly-web:local
```

### Docker Scout (Alternative)

```bash
# Enable Docker Scout
docker scout quickview hourly-web:local

# Detailed CVE report
docker scout cves hourly-web:local
```

## Performance Optimization

### Build Performance

- **Parallel builds**: BuildKit builds stages in parallel when possible
- **Layer caching**: Dependencies cached separately from application code
- **Mount cache**: Bun install cache persisted across builds
- **Multi-stage**: Unnecessary stages pruned from final image

### Runtime Performance

- **Bun runtime**: ~3x faster than Node.js for most operations
- **Compiled output**: React Router SSR pre-compiled
- **Production mode**: Optimizations enabled via NODE_ENV
- **Health checks**: Bun's built-in fetch API for fast health checks

## Maintenance

### Updating Dependencies

```bash
# Update Bun version in Dockerfile
sed -i '' 's/BUN_VERSION=1.2.23/BUN_VERSION=1.2.24/' Dockerfile

# Rebuild
docker build -t hourly-web:updated .
```

### Updating Action Versions

Check for updates at:
- https://github.com/docker/build-push-action/releases
- https://github.com/docker/login-action/releases
- https://github.com/aquasecurity/trivy-action/releases

Update versions in `.github/workflows/build.yml`

### Security Updates

1. **Dependabot**: Automatically creates PRs for action updates
2. **Trivy**: Scans for vulnerabilities on every build
3. **GitHub Security**: Review alerts in Security tab
4. **SBOM**: Track dependencies with Software Bill of Materials

## Best Practices

### DO

- ✅ Use `.dockerignore` to exclude unnecessary files
- ✅ Pin Bun version for reproducible builds
- ✅ Run containers as non-root user
- ✅ Scan images for vulnerabilities regularly
- ✅ Use multi-stage builds
- ✅ Leverage layer caching
- ✅ Set resource limits in production
- ✅ Use health checks
- ✅ Keep base images updated

### DON'T

- ❌ Include secrets in Dockerfile or image
- ❌ Run as root user
- ❌ Copy node_modules into image
- ❌ Use `latest` tag in production
- ❌ Skip vulnerability scanning
- ❌ Ignore security alerts
- ❌ Bundle dev dependencies in production
- ❌ Disable health checks

## References

- [Docker Best Practices 2025](https://docs.docker.com/build/building/best-practices/)
- [Bun Docker Guide](https://bun.sh/guides/ecosystem/docker)
- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [GitHub Actions Security](https://docs.github.com/en/actions/security-guides)
- [BuildKit Documentation](https://docs.docker.com/build/buildkit/)
