# Worklogs Feature Review Findings

Date: 2025-10-30

## Summary
- Medium: Alt/Option duplication marks original event as a move
- Medium: Workday preferences can invalidate commit-derived worklogs
- Low: Auto-detected timezone never surfaces in preferences select

## Details

### Alt/Option duplication marks original event as a move (Medium)
- File: `packages/web/app/widgets/worklogs-calendar/ui/worklog-calendar.tsx`
- When Alt-dragging to duplicate, we call `handleEventDrop` with the original timestamps.
- `handleEventDrop` always registers a `move` change, so the untouched source event shows as modified.
- Impact: Users see phantom unsaved changes and bogus payloads during save.
- Recommendation: Skip registering a change when start/end match the original event.
### Workday preferences can invalidate commit-derived worklogs (Medium)
- File: `packages/web/app/pages/worklogs/lib/calculate-worklogs-from-commits.ts`
- Negative `workdayTotalMinutes` occurs if end < start (allowed via preferences form).
- Generator skips those days, so commit data silently produces no worklogs.
- Recommendation: Validate the workday window or normalize to a positive span.

### Auto-detected timezone never surfaces in preferences select (Low)
- File: `packages/web/app/shared/ui/shadcn/blocks/sidebar/index.tsx`
- Browser detection updates `preferences.timezone`, but the Radix `<Select>` uses `defaultValue`.
- Result: The select keeps displaying the server default (e.g., UTC) until the user picks manually.
- Recommendation: Control the select with a `value` prop or remount when the preference changes.

## Residual Risks
- The commit-to-worklog splitter still depends on user-configured hours; edge cases need tests.
- Calendar bulk actions still post to the update-only mutation; revisit once server create/delete APIs land.
