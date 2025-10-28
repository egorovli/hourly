# Working Hours Reconciliation Tool

A powerful web application for reconciling personal GitLab commit activity with Jira issues to automate monthly working-hours allocation. Visualize your work distribution across projects with an interactive calendar interface.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Bun](https://img.shields.io/badge/bun-latest-black)
![React](https://img.shields.io/badge/react-19-blue)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue)

> **⚠️ Development Status**: This project is currently under active development. Features, APIs, and documentation may change. While the core functionality is stable, some features are still being refined and new capabilities are being added regularly.

## 🎯 Overview

This tool helps developers and teams track, reconcile, and visualize their working hours by:
- **Syncing** worklog entries from Jira with GitLab commit activity
- **Mapping** reconciled issues and commits onto a working-month calendar
- **Visualizing** time distribution across projects with color-coded events
- **Tracking** work patterns with timezone-aware calendar views

Perfect for freelancers, consultants, and teams who need accurate time tracking across multiple projects.

## ✨ Features

### 📅 Interactive Calendar
- **Multiple Views**: Week and month views with drag-and-drop event management
- **Smart Time Ranges**: Automatically adjusts to show early/late events
- **Timezone Support**: Respects user timezone preferences
- **Customizable Week Start**: Configure which day starts your week (Sunday/Monday/etc.)
- **Working Hours**: Set custom workday bounds with intelligent buffering

### 🔄 Data Integration
- **Jira Sync**: OAuth2 authentication with automatic token refresh
- **GitLab Integration**: Fetch commits and match them to Jira issues
- **Infinite Scrolling**: Auto-loading queries for large datasets
- **Real-time Updates**: Live data synchronization with progress indicators

### 🎨 Modern UI
- **Dark/Light Modes**: System-aware theme switching
- **Responsive Design**: Works seamlessly on desktop and mobile
- **shadcn/ui Components**: Beautiful, accessible component library
- **Tailwind CSS 4**: Modern utility-first styling
- **Color-Coded Projects**: Distinct pastel colors for easy project identification

### ⚙️ User Preferences
- Timezone configuration
- Week start day selection
- Working day time bounds
- Locale settings
- Theme preferences

## 🛠️ Tech Stack

### Runtime & Framework
- **[Bun](https://bun.sh/)** - Fast JavaScript runtime and package manager
- **[React Router v7](https://reactrouter.com/)** - Full-stack React framework with SSR
- **[React 19](https://react.dev/)** - Latest React with modern hooks and features

### UI & Styling
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** - Re-usable component library
- **[Radix UI](https://www.radix-ui.com/)** - Accessible component primitives
- **[react-big-calendar](https://github.com/jquense/react-big-calendar)** - Calendar component with drag-and-drop

### State & Data
- **[TanStack Query v5](https://tanstack.com/query)** - Powerful server state management
- **[SQLite](https://www.sqlite.org/)** - Lightweight embedded database
- **[MikroORM 6](https://mikro-orm.io/)** - TypeScript ORM with migrations

### Authentication & APIs
- **[Remix Auth](https://github.com/sergiodxa/remix-auth)** - OAuth2 authentication
- **Atlassian/Jira API v3** - Worklog and issue tracking
- **GitLab API v4** - Commit and project data

### Validation & Testing
- **[Zod 4](https://zod.dev/)** - TypeScript-first schema validation
- **[Conform](https://conform.guide/)** - Form validation
- **[Jest](https://jestjs.io/)** - Unit and integration testing
- **[Testing Library](https://testing-library.com/)** - React component testing
- **[Playwright](https://playwright.dev/)** - End-to-end testing

### Code Quality
- **[Biome](https://biomejs.dev/)** - Fast linter and formatter
- **TypeScript Strict Mode** - Maximum type safety
- **[dbmate](https://github.com/amacneil/dbmate)** - Database migrations

## 📋 Prerequisites

- **[Bun](https://bun.sh/)** >= 1.0.0
- **Node.js** >= 20.x (for some tooling)
- **Atlassian Account** with Jira access
- **GitLab Account** (gitlab.com or self-hosted)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd working-hours
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Configure Environment Variables

Create a `.env` file in `packages/web/`:

```bash
cd packages/web
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# Atlassian OAuth2
ATLASSIAN_CLIENT_ID=your-atlassian-client-id
ATLASSIAN_CLIENT_SECRET=your-atlassian-client-secret
ATLASSIAN_CALLBACK_URL=http://localhost:3000/auth/atlassian/callback

# GitLab OAuth2
GITLAB_APPLICATION_ID=your-gitlab-app-id
GITLAB_APPLICATION_SECRET=your-gitlab-app-secret
GITLAB_CALLBACK_URL=http://localhost:3000/auth/gitlab/callback
GITLAB_BASE_URL=https://gitlab.com

# Session Security
SESSION_SECRET=generate-a-random-secret-here
```

### 4. Set Up Database

```bash
cd packages/web

# Run migrations
bun run db:migrate

# Check migration status
bun run db:status
```

### 5. Start Development Server

```bash
# From project root
bun run --filter @working-hours/web dev
```

Visit http://localhost:3000

## 🔐 OAuth Application Setup

### Atlassian (Jira)

1. Go to [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/)
2. Create a new OAuth 2.0 app
3. Add callback URL: `http://localhost:3000/auth/atlassian/callback`
4. Request scopes:
   - `read:jira-work`
   - `read:jira-user`
   - `offline_access`
5. Copy Client ID and Secret to `.env`

### GitLab

1. Go to GitLab → Settings → Applications
2. Create a new application
3. Add callback URL: `http://localhost:3000/auth/gitlab/callback`
4. Request scopes:
   - `read_user`
   - `read_api`
   - `read_repository`
5. Copy Application ID and Secret to `.env`

## 📦 Project Structure

```
working-hours/
├── packages/
│   └── web/                    # Main application
│       ├── app/
│       │   ├── routes/         # React Router v7 routes
│       │   │   ├── __.tsx                    # Root layout
│       │   │   ├── __._index.tsx             # Main dashboard
│       │   │   ├── auth.$provider.*          # OAuth flows
│       │   │   ├── jira.*                    # Jira data loaders
│       │   │   ├── gitlab.*                  # GitLab data loaders
│       │   │   └── preferences.tsx           # User settings
│       │   ├── components/
│       │   │   ├── shadcn/                   # shadcn/ui components
│       │   │   └── ui/                       # Custom components
│       │   ├── lib/
│       │   │   ├── atlassian/                # Jira API client
│       │   │   ├── gitlab/                   # GitLab API client
│       │   │   ├── mikro-orm/                # Database entities
│       │   │   ├── session/                  # Session storage
│       │   │   ├── auth/                     # Auth strategies
│       │   │   └── cookies/                  # Cookie management
│       │   ├── domain/                       # Business logic & types
│       │   ├── hooks/                        # Custom React hooks
│       │   └── styles/                       # Global CSS
│       ├── db/
│       │   ├── migrations/                   # Database migrations
│       │   └── data.db                       # SQLite database
│       └── public/                           # Static assets
├── CLAUDE.md                                 # Development guidelines
└── README.md                                 # This file
```

## 💻 Development

### Available Commands

```bash
# Development server
bun run --filter @working-hours/web dev

# Type checking
bun run --filter @working-hours/web check-types

# Linting
bun run lint              # Check all files
bun run lint:fix          # Auto-fix issues

# Testing
bun run --filter @working-hours/web test

# Production build
bun run --filter @working-hours/web build
bun run --filter @working-hours/web start
```

### Database Commands

```bash
cd packages/web

# Create new migration
bun run db:new migration-name

# Run migrations
bun run db:migrate

# Rollback last migration
bun run db:rollback

# Check migration status
bun run db:status
```

### Adding shadcn/ui Components

```bash
cd packages/web
bunx --bun shadcn@latest add <component-name>
```

**Important:** After adding components:
- Replace `@/lib/utils` imports with `~/lib/util/index.ts`
- Ensure named exports (not default exports)
- Verify `~/` path alias is used (not `@/`)

## 🏗️ Architecture

### Feature-Sliced Design (FSD)

The application follows [Feature-Sliced Design](https://feature-sliced.design/) methodology for scalable, maintainable architecture.

#### Layer Hierarchy

```
app/         ← Application setup, providers, routing
pages/       ← Route pages composing widgets and features
widgets/     ← Large composite UI blocks
features/    ← Business features providing user value
entities/    ← Business domain models and data
shared/      ← Reusable UI kit and utilities
```

#### Key Benefits

- **Scalability**: Easy to add new features without affecting existing code
- **Maintainability**: Clear structure makes navigation and refactoring straightforward
- **Testability**: Isolated layers enable focused unit and integration testing
- **Team Collaboration**: Developers can work on different features independently
- **Dependency Control**: Strict rules prevent architectural violations

#### Layer Examples

**Entities Layer** (Domain Models)
```typescript
// entities/worklog/model/types.ts
export interface LocalWorklogEntry {
  localId: string
  issueKey: string
  timeSpentSeconds: number
  // ...
}
```

**Features Layer** (Business Capabilities)
```typescript
// features/select-jira-projects/ui/jira-projects-selector.tsx
export function JiraProjectsSelector({ value, onChange }) {
  // Reusable project selection feature
}
```

**Widgets Layer** (Composite UI)
```typescript
// widgets/worklogs-calendar/ui/worklogs-calendar.tsx
export function WorklogsCalendar({ events, dateRange }) {
  // Complex calendar widget composing multiple features
}
```

**Pages Layer** (Route Compositions)
```typescript
// pages/worklogs/ui/worklogs-page.tsx
export function WorklogsPage({ loaderData }) {
  // Composes widgets and features for the main dashboard
}
```

#### Adding New Features

1. **Define entities** in `entities/` for domain models
2. **Create features** in `features/` for user-facing functionality
3. **Build widgets** in `widgets/` for complex UI compositions
4. **Integrate in pages** by importing and composing components
5. **Update routes** to delegate to the new pages

See `CLAUDE.md` for detailed FSD workflow and import patterns.

### Authentication Flow

1. User initiates OAuth flow (Atlassian or GitLab)
2. Provider redirects back with authorization code
3. Exchange code for access/refresh tokens
4. Store tokens in database via MikroORM
5. Merge provider data into single session
6. Session persisted in SQLite with automatic cleanup

### Data Loading Pattern

1. **Resource Routes** act as data loaders (e.g., `jira.projects.tsx`)
2. Return JSON for TanStack Query consumption
3. Handle authentication and API client creation
4. Support cursor/offset pagination
5. Main dashboard coordinates multiple infinite queries

### Infinite Queries with Auto-Loading

- Custom hook: `useAutoLoadInfiniteQuery`
- Automatically fetches all pages in background
- Progress component: `AutoLoadProgress`
- Used for: worklog entries, Jira issues, GitLab commits

### Database Access

- MikroORM entities: `Session`, `Token`, `Profile`
- Entity Manager forked per request: `orm.em.fork()`
- Migrations managed by dbmate
- Database file: `db/data.db`

### API Clients

- **Atlassian client**: Jira API v3 with automatic token refresh
- **GitLab client**: API v4 with parallel batch processing
- Both support rate limiting and error handling
- Tokens retrieved from database via session

## 🎨 Styling Conventions

### Biome Configuration

- **No default exports** (except routes, config, tests)
- **Single quotes** for strings
- **Tab indentation** (width: 2)
- **100-character line width**
- **No semicolons** (ASI)
- **Import extensions required** (`.ts`, `.tsx`)
- **File naming**: kebab-case
- **Module alias**: `~/` for `app/` imports

### Don't Worry About Formatting

All formatting is handled by Biome:
```bash
bun run lint:fix
```

Focus on logic and correctness - Biome handles whitespace, quotes, line width, etc.

## 🔧 Configuration

### User Preferences

Configure via Settings page or cookie:

- **Theme**: Light/Dark/System
- **Locale**: Language preference
- **Timezone**: IANA timezone (e.g., `America/New_York`)
- **Week Starts On**: 0=Sunday, 1=Monday, etc.
- **Working Day Times**: Start and end times (HH:MM format)
- **Minimum Duration**: Minimum worklog duration in minutes

Preferences are stored in a cookie and respected throughout the application.

## 🧪 Testing

### Unit & Integration Tests

```bash
bun run --filter @working-hours/web test
```

### Test Patterns

- Tests co-located with source files: `*.test.ts`, `*.test.tsx`
- React 19 globals available in test files
- Testing Library for component tests
- Jest for unit tests

### Dev Login Shortcut

In development mode, bypass OAuth:

```
GET /dev/hijack-session
```

Assumes an existing authenticated session for quick testing.

## 🚢 Deployment

### Build for Production

```bash
bun run --filter @working-hours/web build
```

### Environment Variables

Ensure all production environment variables are set:

- OAuth credentials (production callback URLs)
- Secure `SESSION_SECRET`
- Database path (if using custom location)

### Database Migrations

```bash
cd packages/web
bun run db:migrate
```

### Start Production Server

```bash
bun run --filter @working-hours/web start
```

## 🤝 Contributing

### Code Style

- Follow existing patterns and conventions
- Run `bun run lint:fix` before committing
- Write tests for new features
- Update documentation as needed

### Commit Guidelines

- Use descriptive commit messages
- Reference issue numbers when applicable
- Keep commits focused and atomic

### Pull Requests

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit PR with clear description

## 📝 Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Development guidelines and AI assistant instructions
- **[React Router Docs](https://reactrouter.com/)** - Framework documentation
- **[TanStack Query](https://tanstack.com/query)** - State management
- **[shadcn/ui](https://ui.shadcn.com/)** - Component library
- **[MikroORM](https://mikro-orm.io/)** - ORM documentation

## 🐛 Troubleshooting

### Common Issues

**Database locked error:**
```bash
# Stop all running processes
# Delete db/data.db-journal if exists
bun run db:migrate
```

**OAuth callback errors:**
- Verify callback URLs match exactly in provider settings
- Check environment variables are loaded correctly
- Ensure ports match (default: 3000)

**Type errors:**
```bash
bun run --filter @working-hours/web check-types
```

**Biome errors:**
```bash
bun run lint:fix
# For unsafe fixes:
bunx --bun biome check . --write --unsafe
```

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- [React Router](https://reactrouter.com/) - Full-stack React framework
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful component library
- [react-big-calendar](https://github.com/jquense/react-big-calendar) - Calendar component
- [Bun](https://bun.sh/) - Fast JavaScript runtime
- [Biome](https://biomejs.dev/) - Fast linter and formatter

## 📧 Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review documentation and troubleshooting guide

---

Built with ❤️ using Bun, React Router v7, and modern web technologies.
