import type { LocalWorklogEntry } from '~/entities/index.ts'
import { DateTime } from 'luxon'

interface Commit {
	createdAt: string | null
	issueKeys: string[]
}

interface IssueInfo {
	key: string
	summary: string
	projectName: string
}

interface Preferences {
	workingDayStartTime?: string
	workingDayEndTime?: string
	minimumDurationMinutes?: number
	timezone?: string
}

/**
 * Calculate worklog entries from commits based on commit dates and issue references
 * Groups commits by day and issue, then splits workday across issues respecting minimum duration
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex calculation logic for worklog distribution
export function calculateWorklogsFromCommits(
	commits: Commit[],
	issuesMap: Map<string, IssueInfo>,
	preferences: Preferences,
	authorName: string,
	authorAccountId: string
): Omit<LocalWorklogEntry, 'localId'>[] {
	const workingDayStartTime = preferences.workingDayStartTime ?? '09:00'
	const workingDayEndTime = preferences.workingDayEndTime ?? '18:00'
	const minimumDurationMinutes = preferences.minimumDurationMinutes ?? 60
	const timezone = preferences.timezone ?? 'UTC'

	// Parse workday times
	const startParts = workingDayStartTime.split(':').map(Number)
	const endParts = workingDayEndTime.split(':').map(Number)
	const startHour = startParts[0] ?? 9
	const startMinute = startParts[1] ?? 0
	const endHour = endParts[0] ?? 18
	const endMinute = endParts[1] ?? 0

	const workdayStartMinutes = startHour * 60 + startMinute
	const workdayEndMinutes = endHour * 60 + endMinute
	const workdayTotalMinutes = workdayEndMinutes - workdayStartMinutes

	// Group commits by day (YYYY-MM-DD) in user's timezone
	const commitsByDay = new Map<string, Commit[]>()
	for (const commit of commits) {
		if (!commit.createdAt) {
			continue
		}

		// Parse commit date and convert to user's timezone
		// GitLab API returns ISO 8601 strings, typically in UTC or with timezone info
		// Strategy: Parse respecting timezone in string, normalize to UTC, then convert to user timezone
		let commitDateUtc: DateTime | null = null

		// Check if the string has timezone info (ends with Z or +/-HH:MM)
		const hasTimezone = /[+-]\d{2}:\d{2}$|[Zz]$/.test(commit.createdAt)

		if (hasTimezone) {
			// Has timezone - parse as-is and convert to UTC
			const parsed = DateTime.fromISO(commit.createdAt)
			if (parsed.isValid) {
				commitDateUtc = parsed.toUTC()
			}
		} else {
			// No timezone in string - assume it's UTC (GitLab typically returns UTC)
			commitDateUtc = DateTime.fromISO(commit.createdAt, { zone: 'utc' })
		}

		// If still invalid, try fallback parsing
		if (!commitDateUtc || !commitDateUtc.isValid) {
			// Try as Date object (handles many formats, but loses precision on timezone)
			const dateObj = new Date(commit.createdAt)
			if (!Number.isNaN(dateObj.getTime())) {
				// Date constructor parses ISO strings but treats them as local time if no timezone
				// To be safe, convert to UTC
				commitDateUtc = DateTime.fromJSDate(dateObj, { zone: 'utc' })
			}
		}

		// Skip if still invalid
		if (!commitDateUtc || !commitDateUtc.isValid) {
			continue
		}

		// Convert from UTC to user's timezone
		const commitDateLocal = commitDateUtc.setZone(timezone)
		if (!commitDateLocal.isValid) {
			continue
		}

		// Get day key in user's timezone (YYYY-MM-DD)
		const dayKey = commitDateLocal.toFormat('yyyy-MM-dd')
		if (!dayKey || dayKey.length !== 10) {
			continue
		}

		if (!commitsByDay.has(dayKey)) {
			commitsByDay.set(dayKey, [])
		}
		const dayCommits = commitsByDay.get(dayKey)
		if (dayCommits) {
			dayCommits.push(commit)
		}
	}

	const worklogEntries: Omit<LocalWorklogEntry, 'localId'>[] = []

	// Process each day
	for (const [dayKey, dayCommits] of commitsByDay.entries()) {
		// Group commits by issue key (normalize to uppercase for consistency)
		const commitsByIssue = new Map<string, Commit[]>()
		for (const commit of dayCommits) {
			for (const issueKey of commit.issueKeys ?? []) {
				if (!issueKey) {
					continue
				}
				// Normalize to uppercase for consistent matching
				const normalizedKey = issueKey.toUpperCase()
				if (!commitsByIssue.has(normalizedKey)) {
					commitsByIssue.set(normalizedKey, [])
				}
				const issueCommits = commitsByIssue.get(normalizedKey)
				if (issueCommits) {
					issueCommits.push(commit)
				}
			}
		}

		// Filter out issues that don't exist in issuesMap
		// issuesMap keys are already uppercase, and we normalized commitsByIssue keys to uppercase
		let validIssues = Array.from(commitsByIssue.keys()).filter(key => {
			if (!key) {
				return false
			}
			// Both should be uppercase, so direct comparison
			return issuesMap.has(key)
		})

		if (validIssues.length === 0) {
			continue
		}

		// Calculate duration per issue
		let issueCount = validIssues.length
		let durationPerIssueMinutes = Math.floor(workdayTotalMinutes / issueCount)
		let remainingMinutes = workdayTotalMinutes % issueCount

		// If we can't fit all issues with minimum duration, reduce to the number that can fit
		if (durationPerIssueMinutes < minimumDurationMinutes) {
			// Calculate maximum number of issues that can fit with minimum duration
			const maxIssuesWithMinimum = Math.floor(workdayTotalMinutes / minimumDurationMinutes)

			if (maxIssuesWithMinimum === 0) {
				// Can't fit even one issue with minimum duration, skip this day
				continue
			}

			// Use only the first N issues that can fit with minimum duration
			// Prioritize issues that appear in more commits
			const issuesWithCommitCount = validIssues
				.map(issueKey => {
					const commits = commitsByIssue.get(issueKey) ?? []
					return { issueKey, commitCount: commits.length }
				})
				.sort((a, b) => b.commitCount - a.commitCount)

			const prioritizedIssues = issuesWithCommitCount
				.slice(0, maxIssuesWithMinimum)
				.map(item => item.issueKey)

			// Update to use only the prioritized issues
			validIssues = prioritizedIssues
			issueCount = validIssues.length
			durationPerIssueMinutes = Math.floor(workdayTotalMinutes / issueCount)
			remainingMinutes = workdayTotalMinutes % issueCount
		}

		// Create worklog entries for each issue
		let currentStartMinutes = workdayStartMinutes

		for (let i = 0; i < validIssues.length; i++) {
			const issueKey = validIssues[i]
			if (!issueKey) {
				continue
			}
			// issueKey is already uppercase from our normalization above
			const issueInfo = issuesMap.get(issueKey)

			if (!issueInfo) {
				continue
			}

			// Calculate duration: equal share + remaining minutes go to last issue
			let durationMinutes = durationPerIssueMinutes
			if (i === validIssues.length - 1) {
				durationMinutes += remainingMinutes
			}

			// Ensure minimum duration
			if (durationMinutes < minimumDurationMinutes) {
				durationMinutes = minimumDurationMinutes
			}

			const durationSeconds = durationMinutes * 60

			// Calculate start time in user's timezone
			const startHourCalc = Math.floor(currentStartMinutes / 60)
			const startMinuteCalc = currentStartMinutes % 60

			// Create date-time in user's timezone
			// dayKey is in format YYYY-MM-DD in user's timezone
			const startedDateLocal = DateTime.fromObject(
				{
					year: Number.parseInt(dayKey.substring(0, 4), 10),
					month: Number.parseInt(dayKey.substring(5, 7), 10),
					day: Number.parseInt(dayKey.substring(8, 10), 10),
					hour: startHourCalc,
					minute: startMinuteCalc,
					second: 0
				},
				{
					zone: timezone
				}
			)

			if (!startedDateLocal.isValid) {
				continue
			}

			// Convert to ISO string for worklog entry
			const startedIso = startedDateLocal.toISO()
			if (!startedIso) {
				continue
			}

			// Create worklog entry
			worklogEntries.push({
				issueKey: issueInfo.key,
				summary: issueInfo.summary,
				projectName: issueInfo.projectName,
				authorName,
				started: startedIso,
				timeSpentSeconds: durationSeconds
			})

			// Move to next issue start time
			currentStartMinutes += durationMinutes
		}
	}

	return worklogEntries
}
