# Feature-Sliced Design (FSD) Refactoring Plan

## 📋 Executive Summary

This plan refactors the monolithic `packages/web/app/routes/__._index.tsx` route (2,895 lines) into a scalable, maintainable FSD architecture. The refactoring will:

- Split code across **6 FSD layers** (app, pages, widgets, features, entities, shared)
- Create **8 business domain slices** (worklogs, jira-projects, jira-users, gitlab-projects, gitlab-contributors, calendar, filters, debug)
- Extract **40+ components** into proper segments (ui, api, model, lib, config)
- Enforce **strict dependency rules** preventing circular dependencies

---

## 📚 FSD Layers & Dependency Rules

### Layer Hierarchy (Top → Bottom)

```
app/         ← Application setup, providers, routing
pages/       ← Route pages composing widgets and features
widgets/     ← Large composite UI blocks
features/    ← Business features providing user value
entities/    ← Business domain models and data
shared/      ← Reusable UI kit and utilities
```

### Dependency Rules

- ✅ **Allowed**: Import from lower layers (pages → widgets → features → entities → shared)
- ❌ **Forbidden**: Same-level imports (features cannot import other features)
- ❌ **Forbidden**: Upward imports (entities cannot import features)

---

## 🏗️ Proposed FSD Structure

```
packages/web/app/
├── app/                          # Layer 1: Application
│   ├── providers/
│   │   ├── query-client.tsx      # TanStack Query setup
│   │   ├── theme-provider.tsx    # Theme/dark mode
│   │   └── index.tsx             # Provider composition
│   ├── styles/                   # Global styles
│   │   ├── globals.css
│   │   ├── calendar.css
│   │   └── schedule-x.css
│   └── config/
│       ├── query.ts              # Query client config
│       └── constants.ts          # Global constants
│
├── pages/                        # Layer 2: Pages
│   └── worklogs/
│       ├── ui/
│       │   └── worklogs-page.tsx           # Main page component
│       ├── model/
│       │   ├── use-worklogs-page-state.ts  # Page-level state
│       │   └── types.ts                    # Page-specific types
│       └── index.ts
│
├── widgets/                      # Layer 3: Widgets
│   ├── worklogs-calendar/
│   │   ├── ui/
│   │   │   ├── worklogs-calendar.tsx
│   │   │   ├── calendar-toolbar.tsx
│   │   │   └── calendar-event-content.tsx
│   │   ├── model/
│   │   │   ├── use-calendar-state.ts
│   │   │   ├── use-business-hours.ts
│   │   │   └── types.ts
│   │   ├── lib/
│   │   │   ├── generate-color-from-string.ts
│   │   │   └── calendar-prop-getters.ts
│   │   ├── config/
│   │   │   └── constants.ts
│   │   └── index.ts
│   │
│   ├── filters-panel/
│   │   ├── ui/
│   │   │   ├── filters-panel.tsx
│   │   │   ├── filter-section.tsx
│   │   │   └── filter-dependency-message.tsx
│   │   ├── model/
│   │   │   └── use-filters-state.ts
│   │   └── index.ts
│   │
│   └── debug-panel/
│       ├── ui/
│       │   ├── debug-panel.tsx
│       │   ├── worklog-debug-card.tsx
│       │   ├── issue-debug-card.tsx
│       │   └── commit-debug-card.tsx
│       └── index.ts
│
├── features/                     # Layer 4: Features
│   ├── select-jira-projects/
│   │   ├── ui/
│   │   │   └── jira-projects-selector.tsx
│   │   ├── api/
│   │   │   └── use-jira-projects-query.ts
│   │   ├── model/
│   │   │   └── types.ts
│   │   └── index.ts
│   │
│   ├── select-jira-users/
│   │   ├── ui/
│   │   │   └── jira-users-selector.tsx
│   │   ├── api/
│   │   │   └── use-jira-users-query.ts
│   │   ├── model/
│   │   │   └── types.ts
│   │   └── index.ts
│   │
│   ├── select-gitlab-projects/
│   │   ├── ui/
│   │   │   └── gitlab-projects-selector.tsx
│   │   ├── api/
│   │   │   └── use-gitlab-projects-query.ts
│   │   ├── model/
│   │   │   └── types.ts
│   │   └── index.ts
│   │
│   ├── select-gitlab-contributors/
│   │   ├── ui/
│   │   │   └── gitlab-contributors-selector.tsx
│   │   ├── api/
│   │   │   └── use-gitlab-contributors-query.ts
│   │   ├── model/
│   │   │   └── types.ts
│   │   └── index.ts
│   │
│   ├── select-date-range/
│   │   ├── ui/
│   │   │   └── date-range-filter.tsx
│   │   ├── model/
│   │   │   └── use-date-range-presets.ts
│   │   └── index.ts
│   │
│   ├── manage-worklogs/
│   │   ├── ui/
│   │   │   └── worklog-editor.tsx
│   │   ├── model/
│   │   │   ├── worklog-reducer.ts
│   │   │   ├── use-worklog-changes.ts
│   │   │   └── types.ts
│   │   ├── lib/
│   │   │   └── compare-worklog-entries.ts
│   │   └── index.ts
│   │
│   ├── load-worklog-entries/
│   │   ├── api/
│   │   │   ├── use-worklog-entries-query.ts
│   │   │   └── use-auto-load.ts
│   │   ├── model/
│   │   │   └── types.ts
│   │   └── index.ts
│   │
│   └── load-jira-issues/
│       ├── api/
│       │   ├── use-jira-issues-query.ts
│       │   └── use-commit-issues-query.ts
│       ├── model/
│       │   └── types.ts
│       └── index.ts
│
├── entities/                     # Layer 5: Entities
│   ├── worklog/
│   │   ├── model/
│   │   │   ├── types.ts
│   │   │   └── schema.ts
│   │   ├── lib/
│   │   │   ├── format-duration.ts
│   │   │   └── validate-worklog.ts
│   │   └── index.ts
│   │
│   ├── jira-project/
│   │   ├── model/
│   │   │   └── types.ts
│   │   └── index.ts
│   │
│   ├── jira-user/
│   │   ├── model/
│   │   │   └── types.ts
│   │   └── index.ts
│   │
│   ├── jira-issue/
│   │   ├── model/
│   │   │   └── types.ts
│   │   └── index.ts
│   │
│   ├── gitlab-project/
│   │   ├── model/
│   │   │   └── types.ts
│   │   └── index.ts
│   │
│   ├── gitlab-contributor/
│   │   ├── model/
│   │   │   └── types.ts
│   │   └── index.ts
│   │
│   ├── gitlab-commit/
│   │   ├── model/
│   │   │   └── types.ts
│   │   └── index.ts
│   │
│   └── calendar-event/
│       ├── model/
│       │   ├── types.ts
│       │   └── transform.ts
│       ├── lib/
│       │   └── generate-calendar-events.ts
│       └── index.ts
│
└── shared/                       # Layer 6: Shared
    ├── ui/                       # UI kit (already exists)
    │   ├── auto-load-progress.tsx
    │   ├── error-placeholder.tsx
    │   ├── empty-state.tsx
    │   └── loading-spinner.tsx
    │
    ├── lib/                      # Utilities
    │   ├── formats/
    │   │   ├── format-duration.ts
    │   │   ├── format-date-time.ts
    │   │   └── format-error.ts
    │   ├── array/
    │   │   └── chunk-array.ts
    │   ├── query/
    │   │   └── infer-query-key-params.ts
    │   └── colors/
    │       ├── generate-color-from-string.ts
    │       └── pastel-palette.ts
    │
    ├── api/                      # API base layers
    │   ├── query-client.ts
    │   └── types.ts
    │
    ├── config/                   # Shared constants
    │   └── pagination.ts
    │
    └── types/                    # Common types
        └── index.ts
```

---

## 📦 Detailed Migration Map

### 1. Shared Layer (No dependencies)

#### shared/lib/formats/

```typescript
// format-duration.ts
export function formatDurationFromSeconds(seconds?: number): string

// format-date-time.ts
export function formatDateTimeLabel(value?: string): string

// format-error.ts
export function getErrorMessage(error: unknown): string
```

#### shared/lib/array/

```typescript
// chunk-array.ts
export function chunkArray<T>(items: T[], size: number): T[][]
```

#### shared/lib/colors/

```typescript
// pastel-palette.ts
export const PASTEL_COLORS = [...]

// generate-color-from-string.ts
export function generateColorFromString(str: string): {
  backgroundColor: string
  textColor: string
  borderColor: string
}
```

#### shared/ui/

```typescript
// error-placeholder.tsx
export function ErrorPlaceholder({ message, className }: Props)

// Already exists: auto-load-progress.tsx
```

#### shared/config/

```typescript
// pagination.ts
export const PAGE_SIZE = 12
```

---

### 2. Entities Layer (Depends on: shared)

#### entities/worklog/

```typescript
// model/types.ts
export interface LocalWorklogEntry {
  localId: string
  id?: string
  issueKey: string
  summary: string
  projectName: string
  authorName: string
  started: string
  timeSpentSeconds: number
  isNew?: boolean
}

export interface WorklogChanges {
  newEntries: LocalWorklogEntry[]
  modifiedEntries: LocalWorklogEntry[]
  deletedEntries: LocalWorklogEntry[]
  hasChanges: boolean
  changeCount: number
}

// lib/format-duration.ts (re-export from shared with domain context)
```

#### entities/calendar-event/

```typescript
// model/types.ts
export interface WorklogCalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: {
    issueKey: string
    issueSummary: string
    projectName: string
    authorName: string
    timeSpentSeconds: number
    started: string
  }
}

// lib/generate-calendar-events.ts
export function transformWorklogsToEvents(
  worklogs: LocalWorklogEntry[]
): WorklogCalendarEvent[]
```

#### entities/jira-project/, jira-user/, jira-issue/

```typescript
// model/types.ts for each
// Extract type definitions from loader return types
```

---

### 3. Features Layer (Depends on: entities, shared)

#### features/select-jira-projects/

```typescript
// ui/jira-projects-selector.tsx
export function JiraProjectsSelector({
  data,
  value,
  onChange
}: Props)

// api/use-jira-projects-query.ts
export function useJiraProjectsQuery(userId: string)

// model/types.ts
export interface JiraProjectsSelectorProps {
  data: JiraProjectsData
  value: string[]
  onChange: (value: string[]) => void
}
```

#### features/manage-worklogs/

```typescript
// model/worklog-reducer.ts
export type State = {
  selectedJiraProjectIds: string[]
  selectedJiraUserIds: string[]
  selectedGitlabProjectIds: string[]
  selectedGitlabContributorIds: string[]
  dateRange?: DateRange
  calendarViewDateRange?: DateRange
  loadedWorklogEntries: Map<string, LocalWorklogEntry>
  localWorklogEntries: Map<string, LocalWorklogEntry>
}

export type Action =
  | { type: 'selectedJiraProjectIds.select'; payload: string[] }
  | { type: 'worklog.create'; payload: Omit<LocalWorklogEntry, 'localId'> }
  | ...

export function reducer(state: State, action: Action): State

// lib/compare-worklog-entries.ts
export function compareWorklogEntries(
  loaded: Map<string, LocalWorklogEntry>,
  local: Map<string, LocalWorklogEntry>
): WorklogChanges
```

#### features/load-worklog-entries/

```typescript
// api/use-worklog-entries-query.ts
export function useWorklogEntriesInfiniteQuery({
  userId,
  projectIds,
  userIds,
  dateRange
}: Params)

// api/use-auto-load.ts
export function useAutoLoadInfiniteQuery(query, options)
```

#### features/select-date-range/

```typescript
// ui/date-range-filter.tsx
export function DateRangeFilter({ value, onChange }: Props)

// model/use-date-range-presets.ts
export function useDateRangePresets()
```

---

### 4. Widgets Layer (Depends on: features, entities, shared)

#### widgets/worklogs-calendar/

```typescript
// ui/worklogs-calendar.tsx
export function WorklogsCalendar({
  events,
  date,
  view,
  onNavigate,
  onViewChange,
  onRangeChange,
  businessHours,
  timezone
}: Props)

// ui/calendar-toolbar.tsx
export function WorklogCalendarToolbar({
  label,
  onNavigate,
  onView,
  view,
  views
}: ToolbarProps)

// ui/calendar-event-content.tsx
export function WorklogCalendarEventContent({
  event
}: EventProps<WorklogCalendarEvent>)

// model/use-calendar-state.ts
export function useCalendarState()

// model/use-business-hours.ts
export function useBusinessHours({
  calendarDate,
  calendarEvents,
  viewDateRange,
  workingDayStartTime,
  workingDayEndTime
})

// lib/calendar-prop-getters.ts
export function getEventPropGetter()
export function getDayPropGetter()
export function getSlotPropGetter()

// config/constants.ts
export const VIEW_LABELS = {...}
export const FORMATS = {...}
```

#### widgets/filters-panel/

```typescript
// ui/filters-panel.tsx
export function FiltersPanel({
  jiraProjectsSelector,
  jiraUsersSelector,
  gitlabProjectsSelector,
  gitlabContributorsSelector,
  dateRangeFilter,
  onDebugPresetApply
}: Props)

// ui/filter-section.tsx
export function FilterSection({
  title,
  description,
  dependencyHint,
  children
}: Props)

// ui/filter-dependency-message.tsx
export function FilterDependencyMessage({ children }: Props)
```

#### widgets/debug-panel/

```typescript
// ui/debug-panel.tsx
export function DebugPanel({
  worklogEntries,
  jiraIssues,
  gitlabCommits,
  commitIssues,
  isOpen,
  onToggle
}: Props)

// ui/worklog-debug-card.tsx
export function WorklogEntryDebugCard({ entry }: Props)

// ui/issue-debug-card.tsx
export function RelevantIssueDebugCard({ issue }: Props)

// ui/commit-debug-card.tsx
export function GitlabCommitDebugCard({ commit }: Props)
```

---

### 5. Pages Layer (Depends on: widgets, features, entities, shared)

#### pages/worklogs/

```typescript
// ui/worklogs-page.tsx
export default function WorklogsPage({ loaderData }: Props) {
  // Composes all widgets and features
  // Minimal logic - mostly composition
  return (
    <>
      <FiltersPanel ... />
      <WorklogsCalendar ... />
      <DebugPanel ... />
    </>
  )
}

// model/use-worklogs-page-state.ts
export function useWorklogsPageState(loaderData) {
  // Coordinates all feature states
  // Manages cross-feature interactions
}
```

---

### 6. App Layer (Depends on: pages, widgets, features, entities, shared)

#### app/providers/

```typescript
// query-client.tsx
export function QueryClientProvider({ children })

// theme-provider.tsx
export function ThemeProvider({ children })

// index.tsx
export function AppProviders({ children }) {
  return (
    <QueryClientProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  )
}
```

---

## 🔧 Implementation Strategy

### Phase 1: Foundation (Shared + Entities)

**Duration: 2-3 days**

1. Create shared layer structure
2. Extract utility functions to `shared/lib/`
3. Extract constants to `shared/config/`
4. Move reusable UI to `shared/ui/`
5. Define entity types in `entities/*/model/types.ts`
6. Extract entity-specific logic to `entities/*/lib/`

**Success Criteria:**

- ✅ All utilities accessible from `~/shared/lib/*`
- ✅ No circular dependencies in shared layer
- ✅ All entity types defined and exported
- ✅ Tests pass for extracted utilities

---

### Phase 2: Features Extraction

**Duration: 4-5 days**

1. Extract selector components to feature slices
   - `features/select-jira-projects/`
   - `features/select-jira-users/`
   - `features/select-gitlab-projects/`
   - `features/select-gitlab-contributors/`
   - `features/select-date-range/`

2. Extract data loading features
   - `features/load-worklog-entries/`
   - `features/load-jira-issues/`

3. Extract worklog management feature
   - `features/manage-worklogs/`
   - Move reducer and comparison logic

**Success Criteria:**

- ✅ Each feature slice is self-contained
- ✅ Features don't import from other features
- ✅ All TanStack Query hooks properly organized
- ✅ Feature components render correctly in isolation

---

### Phase 3: Widgets Assembly

**Duration: 3-4 days**

1. Create calendar widget
   - `widgets/worklogs-calendar/`
   - Extract calendar-specific state and logic
   - Compose calendar components

2. Create filters panel widget
   - `widgets/filters-panel/`
   - Compose all filter features

3. Create debug panel widget
   - `widgets/debug-panel/`
   - Organize debug cards

**Success Criteria:**

- ✅ Widgets compose features correctly
- ✅ Widget state properly encapsulated
- ✅ No business logic in widget layer
- ✅ Widgets reusable across pages

---

### Phase 4: Page Composition

**Duration: 2-3 days**

1. Create `pages/worklogs/` structure
2. Compose page from widgets
3. Extract page-level state coordination
4. Migrate loader to page index
5. Update route imports

**Success Criteria:**

- ✅ Page is thin composition layer
- ✅ Page coordinates widget interactions
- ✅ Loader properly integrated
- ✅ Full page renders correctly

---

### Phase 5: App Layer & Testing

**Duration: 2-3 days**

1. Set up app providers structure
2. Extract global configuration
3. Update all route imports
4. Comprehensive testing
5. Performance optimization
6. Documentation updates

**Success Criteria:**

- ✅ All imports use proper FSD paths
- ✅ No circular dependencies detected
- ✅ Performance metrics maintained or improved
- ✅ Full test coverage
- ✅ Documentation complete

---

## 📊 Migration Checklist

### Code Organization

- [ ] Create all FSD layer directories
- [ ] Set up index.ts barrel exports for each slice

### Shared Layer

- [ ] Extract formatDurationFromSeconds → shared/lib/formats/
- [ ] Extract formatDateTimeLabel → shared/lib/formats/
- [ ] Extract getErrorMessage → shared/lib/formats/
- [ ] Extract chunkArray → shared/lib/array/
- [ ] Extract generateColorFromString → shared/lib/colors/
- [ ] Extract PASTEL_COLORS → shared/lib/colors/
- [ ] Extract PAGE_SIZE → shared/config/pagination.ts
- [ ] Move ErrorPlaceholder → shared/ui/
- [ ] Create EmptyState → shared/ui/

### Entities Layer

- [ ] Define LocalWorklogEntry type → entities/worklog/model/
- [ ] Define WorklogCalendarEvent type → entities/calendar-event/model/
- [ ] Define WorklogChanges type → entities/worklog/model/
- [ ] Define Jira entity types → entities/jira-*/model/
- [ ] Define GitLab entity types → entities/gitlab-*/model/
- [ ] Create calendar event transformer → entities/calendar-event/lib/

### Features Layer

- [ ] Extract JiraProjectsSelector → features/select-jira-projects/ui/
- [ ] Extract useJiraProjectsQuery → features/select-jira-projects/api/
- [ ] Extract Users (JiraUsersSelector) → features/select-jira-users/ui/
- [ ] Extract useJiraUsersQuery → features/select-jira-users/api/
- [ ] Extract GitlabProjects → features/select-gitlab-projects/ui/
- [ ] Extract GitlabContributors → features/select-gitlab-contributors/ui/
- [ ] Extract DateRangeFilter → features/select-date-range/ui/
- [ ] Extract worklog reducer → features/manage-worklogs/model/
- [ ] Extract compareWorklogEntries → features/manage-worklogs/lib/
- [ ] Extract useWorklogEntriesQuery → features/load-worklog-entries/api/
- [ ] Extract useJiraIssuesQuery → features/load-jira-issues/api/
- [ ] Extract useAutoLoadInfiniteQuery → features/load-worklog-entries/api/

### Widgets Layer

- [ ] Create WorklogsCalendar → widgets/worklogs-calendar/ui/
- [ ] Create WorklogCalendarToolbar → widgets/worklogs-calendar/ui/
- [ ] Create WorklogCalendarEventContent → widgets/worklogs-calendar/ui/
- [ ] Extract useBusinessHours → widgets/worklogs-calendar/model/
- [ ] Extract calendar prop getters → widgets/worklogs-calendar/lib/
- [ ] Create FiltersPanel → widgets/filters-panel/ui/
- [ ] Create FilterSection → widgets/filters-panel/ui/
- [ ] Create FilterDependencyMessage → widgets/filters-panel/ui/
- [ ] Create DebugPanel → widgets/debug-panel/ui/
- [ ] Create WorklogEntryDebugCard → widgets/debug-panel/ui/
- [ ] Create RelevantIssueDebugCard → widgets/debug-panel/ui/
- [ ] Create GitlabCommitDebugCard → widgets/debug-panel/ui/

### Pages Layer

- [ ] Create WorklogsPage → pages/worklogs/ui/
- [ ] Extract page-level state → pages/worklogs/model/
- [ ] Migrate loader → pages/worklogs/
- [ ] Update route file to re-export from pages/

### App Layer

- [ ] Create QueryClientProvider → app/providers/
- [ ] Create ThemeProvider → app/providers/
- [ ] Set up global styles → app/styles/
- [ ] Create app-level constants → app/config/

### Testing & Quality

- [ ] Write unit tests for each feature
- [ ] Write integration tests for widgets
- [ ] Write E2E tests for page
- [ ] Performance benchmark before/after
- [ ] Bundle size analysis
- [ ] Accessibility audit

### Documentation

- [ ] Update CLAUDE.md with FSD structure
- [ ] Create ARCHITECTURE.md documenting layers
- [ ] Add README.md to each feature slice
- [ ] Document import patterns and rules
- [ ] Create component catalog/Storybook
- [ ] Add migration guide for future features

---

## 🚀 Benefits of This Refactoring

### 1. Scalability

- New features can be added as isolated slices
- Clear boundaries prevent feature bloat
- Team can work on different features in parallel

### 2. Maintainability

- Each slice is self-contained and testable
- Changes in one feature don't affect others
- Clear dependency flow prevents circular deps

### 3. Onboarding

- New developers understand structure immediately
- Consistent patterns across all features
- Easy to find and modify code

### 4. Reusability

- Widgets can be reused across pages
- Features can be composed differently
- Entities define single source of truth

### 5. Testing

- Features can be tested in isolation
- Mock dependencies at layer boundaries
- Integration tests at widget/page level

### 6. Performance

- Code splitting at feature level
- Lazy loading of widgets
- Tree-shaking unused code more effectively

---

## 🎯 Key Principles to Maintain

### 1. One Slice = One Feature

Each feature slice should represent a single user-facing capability.

**Example:** "Select Jira Projects" is one atomic feature

### 2. Strict Layer Boundaries

Maintain strict adherence to the dependency flow. No exceptions to the layer hierarchy.

### 3. Public API via index.ts

Each slice exports only what's needed via barrel files. Internal implementation details stay private.

### 4. Colocation of Related Code

Keep API calls, components, types together in same slice. Don't split by technical layers when it breaks cohesion.

### 5. Minimal Page Logic

Pages should be thin composition layers. Business logic belongs in features/widgets.

### 6. Shared Layer Discipline

Only truly reusable code goes in shared. If it's domain-specific, it belongs in entities or features.

---

## 📚 Further Reading

- [Feature-Sliced Design Official Documentation](https://feature-sliced.design/)
- [FSD Tutorial with React & TypeScript](https://feature-sliced.design/docs/get-started/tutorial)
- [Real-world FSD Examples](https://github.com/feature-sliced/examples)
- [FSD vs Other Architectures](https://feature-sliced.design/docs/about/alternatives)

---

## 🎉 Conclusion

This refactoring plan provides a **production-ready, robust architecture** that will scale with your application's growth while maintaining code quality and developer experience. The phased approach ensures safe, incremental migration with testable checkpoints at each stage.

**Estimated Total Duration:** 13-17 days

**Recommended Team Size:** 2-3 developers working in parallel on different phases

**Risk Level:** Low (incremental migration with rollback points)

---

**Questions or Concerns?**

If you have any questions about this plan or need clarification on any aspect of the FSD architecture, please discuss with the team before beginning implementation.
