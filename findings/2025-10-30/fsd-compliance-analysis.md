# FSD Compliance Analysis

**Date:** 2025-01-20  
**Project:** working-hours  
**Architecture:** Feature-Sliced Design (FSD)

## Executive Summary

Your codebase demonstrates **good adherence** to FSD principles with the correct layer hierarchy and mostly correct import patterns. However, there are several structural deviations and a few import violations that should be addressed for full FSD compliance.

**Overall Compliance Score: 7.5/10**

---

## FSD Layer Structure Analysis

### ✅ Correctly Implemented Layers

1. **Entities Layer** (`app/entities/`)
   - ✅ Properly structured with domain models
   - ✅ Uses barrel exports (`index.ts`)
   - ✅ Contains only types/models, no business logic

2. **Features Layer** (`app/features/`)
   - ✅ Well-organized by business feature
   - ✅ Follows FSD segment structure (api, model, ui)
   - ✅ Features are focused and cohesive

3. **Widgets Layer** (`app/widgets/`)
   - ✅ Properly imports from features/entities/shared
   - ✅ Contains composite UI blocks
   - ✅ Follows segment structure

4. **Pages Layer** (`app/pages/`)
   - ✅ Correctly imports from widgets/features/entities/shared
   - ✅ Uses segment structure (model, ui, lib)

5. **Shared Layer** (`app/shared/`)
   - ✅ Contains reusable UI components
   - ✅ Contains shared utilities
   - ✅ Contains configuration
   - ✅ Properly uses segments (ui, lib, config)

---

## ❌ Structural Deviations from FSD

### 1. Missing App Layer

**Issue:** FSD requires an `app/` layer for app-wide initialization, providers, and routing setup. Your codebase uses:
- `routes/` directory (React Router v7 convention)
- `root.tsx` at the root level
- `providers/` directory separate from app layer

**Current Structure: 🔴 Non-compliant**
```
app/
├── routes/          # Should be app/
├── root.tsx         # Should be app/providers/root.tsx or app/index.tsx
├── providers/       # Should be app/providers/
└── ...
```

**FSD Standard: ✅**
```
app/
├── app/
│   ├── providers/   # App-wide providers
│   ├── index.tsx    # App initialization
│   └── ...
└── ...
```

**Impact:** Medium - While functional, this doesn't follow FSD's app layer convention.

**Recommendation:** 
- Consider creating `app/app/` directory for app-layer concerns
- Move `providers/` into `app/app/providers/`
- Move app initialization logic into `app/app/`

---

### 2. Infrastructure Code Outside FSD Structure

**Issue:** Several directories exist outside the FSD layer hierarchy:

#### a) `lib/` Directory
**Location:** `app/lib/`
**Contents:** API clients, ORM, auth, utilities, cookies, session, preferences

**Current Usage:**
- ✅ `root.tsx` imports from `lib/` (acceptable for app layer)
- ✅ `routes/` import from `lib/` (acceptable for app layer)
- ❌ `pages/` import from `lib/` (violation - should use `shared/lib`)
- ❌ `shared/` imports from `lib/` (violation - circular/incorrect)

**Violations Found:**
```typescript
// packages/web/app/pages/worklogs/ui/worklogs-page.tsx:19
import { cn } from '~/lib/util/index.ts'
import { invariant } from '~/lib/util/index.ts'

// packages/web/app/shared/ui/shadcn/blocks/sidebar/index.tsx:1
import type { SessionUser } from '~/lib/session/storage.ts'
```

**FSD Standard:** Infrastructure code should be:
- In `shared/lib/` if reusable across layers
- In `app/lib/` only if app-layer specific
- Or treated as external dependency

**Recommendation:**
- Move reusable utilities (`cn`, `invariant`) to `shared/lib/util/`
- Keep app-specific infrastructure (`mikro-orm`, `auth`) in `lib/` but don't import from FSD layers
- Create wrapper exports in `shared/lib/` if needed

#### b) `domain/` Directory
**Location:** `app/domain/`
**Contents:** Business logic types, preferences, theme enum

**Current Usage:**
- ✅ Used by routes/pages/widgets/features (correct)
- ✅ Contains domain types (correct)

**Assessment:** ✅ **Acceptable** - Domain types can exist separately or in `shared/domain/` or within entities.

**Recommendation:** Keep as-is or move to `shared/domain/` for better FSD compliance.

#### c) `hooks/` Directory
**Location:** `app/hooks/`
**Contents:** `use-mobile.ts`

**Current Usage:** Not analyzed, but should be in `shared/hooks/` if reusable.

**Recommendation:** Move to `shared/hooks/` if used across layers, or co-locate with features.

---

## ⚠️ Import Violations

### 1. Features Importing from Features

**Violation:** `update-worklog-entries` imports from `load-worklog-entries`

```typescript
// packages/web/app/features/update-worklog-entries/api/use-update-worklog-entries-mutation.ts:3
import { worklogEntriesKeys } from '~/features/load-worklog-entries/index.ts'
```

**FSD Rule:** Features should be independent. They can share code through:
- Entities (domain models)
- Shared layer (utilities)
- Public API contracts

**Severity:** Low - This is a query key dependency, which is somewhat acceptable.

**Recommendation:**
- Extract query keys to `shared/lib/query/query-keys.ts` or
- Create a shared query utilities module in `shared/lib/query/`
- Or create an entity/domain model for worklog queries

---

### 2. Pages Importing from lib/

**Violations Found:**
```typescript
// packages/web/app/pages/worklogs/ui/worklogs-page.tsx
import { cn } from '~/lib/util/index.ts'
import { invariant } from '~/lib/util/index.ts'

// packages/web/app/pages/worklogs/model/use-worklogs-page-state.ts
import { invariant } from '~/lib/util/index.ts'
```

**FSD Rule:** Pages should only import from:
- Widgets
- Features
- Entities
- Shared

**Severity:** Medium - These are utility functions that should be in `shared/lib/`.

**Recommendation:**
- Move `cn` and `invariant` to `shared/lib/util/`
- Update imports across codebase
- Keep `lib/` for app-layer infrastructure only

---

### 3. Shared Importing from lib/

**Violation Found:**
```typescript
// packages/web/app/shared/ui/shadcn/blocks/sidebar/index.tsx:1
import type { SessionUser } from '~/lib/session/storage.ts'
```

**FSD Rule:** Shared layer should never import from app-layer infrastructure (`lib/`).

**Severity:** High - This creates a dependency cycle and violates FSD principles.

**Recommendation:**
- Move `SessionUser` type to `shared/lib/types/` or `entities/session/`
- Or create a domain model in `entities/session/` or `shared/lib/session/`

---

## ✅ Correct Import Patterns

### Widgets → Features ✅
```typescript
// Correct: Widgets can import from features
// packages/web/app/widgets/filters-panel/ui/filters-panel.tsx
import { DateRangeFilter } from '~/features/select-date-range/index.ts'
import { JiraProjectsSelector } from '~/features/select-jira-projects/index.ts'
```

### Widgets → Entities ✅
```typescript
// Correct: Widgets can import from entities
// packages/web/app/widgets/worklogs-calendar/ui/worklog-calendar.tsx
import type { WorklogCalendarEvent } from '~/entities/index.ts'
```

### Pages → Widgets ✅
```typescript
// Correct: Pages can import from widgets
// packages/web/app/pages/worklogs/ui/worklogs-page.tsx
import { WorklogsCalendar } from '~/widgets/worklogs-calendar/index.ts'
```

### Shared → Shared ✅
```typescript
// Correct: Shared can import from shared (internal)
// packages/web/app/shared/ui/shadcn/ui/combobox.tsx
import { Button } from '~/shared/ui/shadcn/ui/button.tsx'
```

---

## Segment Structure Analysis

### ✅ Correct Segment Usage

Your codebase correctly uses FSD segments:

- **`api/`** - API calls, queries, mutations ✅
- **`model/`** - State management, types, business logic ✅
- **`ui/`** - UI components ✅
- **`lib/`** - Feature-specific utilities ✅

**Example - Well-structured feature:**
```
features/load-jira-issues/
├── api/
│   └── use-jira-issues-query.ts
├── model/
│   └── query-keys.ts
└── index.ts
```

---

## Recommendations Summary

### High Priority 🔴

1. **Move utilities from `lib/util/` to `shared/lib/util/`**
   - `cn.ts` → `shared/lib/util/cn.ts`
   - `invariant.ts` → `shared/lib/util/invariant.ts`
   - Update all imports in FSD layers

2. **Fix shared → lib import**
   - Move `SessionUser` type to `shared/lib/types/` or create entity
   - Update `shared/ui/shadcn/blocks/sidebar/index.tsx`

3. **Consider creating app layer**
   - Create `app/app/` directory
   - Move providers and initialization logic there

### Medium Priority 🟡

4. **Extract query keys to shared**
   - Move `worklogEntriesKeys` to `shared/lib/query/query-keys.ts`
   - Break feature-to-feature dependency

5. **Organize domain types**
   - Consider moving `domain/` to `shared/domain/` or
   - Integrate domain types into entities

6. **Move hooks**
   - Move `hooks/use-mobile.ts` to `shared/hooks/use-mobile.ts` if reusable

### Low Priority 🟢

7. **Documentation**
   - Update README with FSD layer explanations
   - Add import rules documentation
   - Consider adding ESLint rules for FSD (Steiger)

---

## FSD Compliance Checklist

- [x] ✅ Correct layer hierarchy (entities → features → widgets → pages)
- [x] ✅ Proper segment structure (api, model, ui, lib)
- [x] ✅ Barrel exports (index.ts) used correctly
- [ ] ❌ App layer properly structured
- [x] ✅ No widgets importing from widgets
- [x] ✅ No pages importing from pages
- [ ] ⚠️ Features importing from features (1 violation)
- [ ] ❌ Infrastructure code properly placed
- [ ] ❌ Shared layer doesn't import from lib/

**Score: 7.5/10**

---

## Additional Notes

### Framework-Specific Considerations

Your codebase uses **React Router v7**, which has its own routing conventions (`routes/` directory). This is acceptable and can coexist with FSD:

- `routes/` can be considered part of the app layer
- Routes import from pages (acceptable)
- Routes can import from lib/ (acceptable for app layer)

However, for strict FSD compliance, consider:
- Creating `app/app/routes/` or
- Documenting that `routes/` is part of the app layer
- Ensuring routes only import from app-layer concerns and pages

### Positive Aspects

1. **Excellent feature organization** - Features are well-scoped and focused
2. **Good use of segments** - Proper separation of api/model/ui
3. **Correct widget composition** - Widgets properly compose features
4. **Clean entity structure** - Entities contain only domain models
5. **Shared layer well-organized** - Good separation of UI, lib, and config

---

## Conclusion

Your codebase demonstrates **strong understanding** of FSD principles and follows most conventions correctly. The main issues are:

1. Infrastructure code placement (`lib/` vs `shared/lib/`)
2. Missing explicit app layer structure
3. A few import violations (features→features, pages→lib, shared→lib)

These are **fixable without major refactoring** and won't significantly impact maintainability in the short term. However, addressing them will improve long-term scalability and strict FSD compliance.

**Recommended Action:** Start with high-priority items (moving utilities to shared, fixing shared→lib import) as these are quick wins that improve compliance immediately.

