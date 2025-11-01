# Testing with Coverage in GitHub Actions

This guide explains how to set up code coverage reporting for Bun tests in GitHub Actions and display the results in pull requests and job summaries.

## Overview

Bun's test runner has built-in coverage reporting that supports:
- **Text output** - Console display (default)
- **LCOV format** - Standard format for CI/CD tools and coverage services

## Configuration

### 1. Configure Bun for Coverage Reports

Add coverage configuration to `bunfig.toml` (or create it if it doesn't exist):

```toml
[test]
# Enable coverage by default (optional)
coverage = true

# Generate both text and LCOV reports
coverageReporter = ["text", "lcov"]

# Output directory for coverage reports
coverageDir = "coverage"

# Skip test files from coverage (recommended)
coverageSkipTestFiles = true

# Ignore specific patterns (optional)
coveragePathIgnorePatterns = [
  "**/*.test.ts",
  "**/*.spec.ts",
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**"
]

# Set coverage thresholds (optional)
coverageThreshold = { lines = 0.7, functions = 0.8 }
```

### 2. GitHub Actions Workflow Setup

Add coverage steps to your test jobs:

```yaml
- name: Run tests with coverage
  run: bun test --coverage

- name: Generate coverage summary
  uses: irongut/CodeCoverageSummary@v1.3.0
  with:
    filename: coverage/lcov.info
    badge: true
    format: markdown
    output: both
    thresholds: '50 75'
    fail_below_min: false  # Set to true to fail if below threshold

- name: Add coverage comment to PR
  uses: marocchino/sticky-pull-request-comment@v2
  if: github.event_name == 'pull_request'
  with:
    recreate: true
    path: code-coverage-results.md

- name: Add coverage to job summary
  run: cat code-coverage-results.md >> $GITHUB_STEP_SUMMARY
```

## Complete Example

Here's a complete example for the API package test job:

```yaml
test-api:
  name: Test API
  needs: type-check-api
  runs-on: ubuntu-latest
  timeout-minutes: 15
  steps:
    - name: Checkout repository
      uses: actions/checkout@v5

    - name: Setup Bun
      uses: oven-sh/setup-bun@v2
      with:
        bun-version: 1.2.23

    - name: Install dependencies
      run: bun install --frozen-lockfile

    - name: Run API tests with coverage
      run: bun run --filter "@hourly/api" test --coverage

    - name: Generate coverage summary
      uses: irongut/CodeCoverageSummary@v1.3.0
      with:
        filename: coverage/lcov.info
        badge: true
        format: markdown
        output: both
        thresholds: '50 75'
        fail_below_min: false

    - name: Upload coverage artifacts
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: api-coverage-report
        path: |
          coverage/
          code-coverage-results.md
        retention-days: 30

    - name: Add coverage comment to PR
      uses: marocchino/sticky-pull-request-comment@v2
      if: github.event_name == 'pull_request'
      with:
        recreate: true
        path: code-coverage-results.md

    - name: Add coverage to job summary
      run: cat code-coverage-results.md >> $GITHUB_STEP_SUMMARY
```

## Coverage Summary Action Options

The `CodeCoverageSummary` action supports the following options:

| Option | Description | Default |
|--------|-------------|---------|
| `filename` | Path to coverage file(s) - supports glob patterns | Required |
| `badge` | Include coverage badge | `false` |
| `format` | Output format: `markdown` or `text` | `text` |
| `output` | Output destination: `console`, `file`, or `both` | `console` |
| `thresholds` | Lower and upper thresholds (space-separated) | `'50 75'` |
| `fail_below_min` | Fail workflow if below lower threshold | `false` |
| `hide_branch_rate` | Hide branch rate metrics | `false` |
| `hide_complexity` | Hide complexity metrics | `false` |
| `indicators` | Include health indicators (✔/➖/❌) | `true` |

## Where Coverage Results Appear

1. **Job Summary** - Visible in the GitHub Actions workflow run page
2. **Pull Request Comments** - Automatically posted as a pinned comment on PRs
3. **Workflow Logs** - Console output during workflow execution
4. **Artifacts** - Coverage files uploaded as downloadable artifacts

## Coverage Thresholds

Set thresholds in `bunfig.toml`:

```toml
[test]
# Single threshold (applies to all metrics)
coverageThreshold = 0.8

# Separate thresholds
coverageThreshold = { lines = 0.7, functions = 0.8, statements = 0.75 }
```

If coverage falls below thresholds, `bun test` will exit with a non-zero code, failing the workflow.

## Advanced: Multiple Coverage Files

If you have multiple packages with separate coverage reports:

```yaml
- name: Generate coverage summary
  uses: irongut/CodeCoverageSummary@v1.3.0
  with:
    filename: 'coverage/**/lcov.info'  # Glob pattern
    badge: true
    format: markdown
    output: both
```

## Alternative: Bun-Specific Coverage Action

There's also a Bun-specific action (`70-10/bun-coverage-report-action`) that provides a more visual coverage report, but the `CodeCoverageSummary` action is more flexible and widely used.

## Best Practices

1. **Skip test files** - Set `coverageSkipTestFiles = true` to exclude test files from coverage
2. **Set reasonable thresholds** - Start with lower thresholds (50-70%) and increase over time
3. **Use artifacts** - Upload coverage reports as artifacts for historical tracking
4. **Don't fail on low coverage initially** - Set `fail_below_min: false` until you establish baseline
5. **Review PR comments** - Coverage comments help reviewers understand test impact

## Resources

- [Bun Test Coverage Documentation](https://bun.com/docs/guides/test/coverage)
- [Code Coverage Summary Action](https://github.com/marketplace/actions/code-coverage-summary)
- [GitHub Actions Job Summaries](https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#adding-a-job-summary)

