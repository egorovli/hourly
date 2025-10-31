import { DateTime } from 'luxon'
import type { WorklogCalendarEvent } from '~/entities/index.ts'

export interface WorklogStatsGroupEntry {
	key: string
	label: string
	totalSeconds: number
	entryCount: number
	meta?: Record<string, string>
}

export interface WorklogStats {
	totalSeconds: number
	totalEntries: number
	byProject: WorklogStatsGroupEntry[]
	byAuthor: WorklogStatsGroupEntry[]
	byDay: Array<
		WorklogStatsGroupEntry & {
			date: Date
		}
	>
	byIssue: WorklogStatsGroupEntry[]
}

const UNASSIGNED_LABEL = 'Unassigned'

export function aggregateWorklogStats(events: WorklogCalendarEvent[]): WorklogStats {
	if (events.length === 0) {
		return {
			totalSeconds: 0,
			totalEntries: 0,
			byProject: [],
			byAuthor: [],
			byDay: [],
			byIssue: []
		}
	}

	let totalSeconds = 0

	const projectMap = new Map<string, WorklogStatsGroupEntry>()
	const authorMap = new Map<string, WorklogStatsGroupEntry>()
	const dayMap = new Map<string, WorklogStatsGroupEntry & { date: Date }>()
	const issueMap = new Map<string, WorklogStatsGroupEntry>()

	for (const event of events) {
		const durationSeconds = ensurePositiveInteger(event.resource.timeSpentSeconds)
		totalSeconds += durationSeconds

		const projectKey =
			event.resource.projectName.trim() || deriveProjectKey(event.resource.issueKey)
		const projectLabel = event.resource.projectName.trim() || projectKey || UNASSIGNED_LABEL
		upsertGroup(projectMap, projectKey || UNASSIGNED_LABEL, projectLabel, durationSeconds, {
			projectName: projectLabel
		})

		const authorKey = event.resource.authorAccountId || event.resource.authorName
		const authorLabel = event.resource.authorName || 'Unknown'
		upsertGroup(authorMap, authorKey || authorLabel, authorLabel, durationSeconds, {
			accountId: event.resource.authorAccountId
		})

		const start =
			event.start instanceof Date ? DateTime.fromJSDate(event.start) : DateTime.fromISO(event.start)
		const dayKey = toDateKey(start)
		const existingDay = dayMap.get(dayKey)
		if (existingDay) {
			existingDay.totalSeconds += durationSeconds
			existingDay.entryCount += 1
		} else {
			dayMap.set(dayKey, {
				key: dayKey,
				label: dayKey,
				totalSeconds: durationSeconds,
				entryCount: 1,
				date: start.toJSDate(),
				meta: {}
			})
		}

		const issueKey = event.resource.issueKey.trim() || event.id
		const issueLabel = issueKey
		upsertGroup(issueMap, issueKey, issueLabel, durationSeconds, {
			summary: event.resource.issueSummary,
			projectName: projectLabel
		})
	}

	return {
		totalSeconds,
		totalEntries: events.length,
		byProject: sortGroupEntries(projectMap),
		byAuthor: sortGroupEntries(authorMap),
		byDay: sortDayEntries(dayMap),
		byIssue: sortGroupEntries(issueMap)
	}
}

function ensurePositiveInteger(value: number | undefined): number {
	if (!value || Number.isNaN(value) || value < 0) {
		return 0
	}

	return Math.floor(value)
}

function deriveProjectKey(issueKey: string | undefined): string {
	if (!issueKey?.includes('-')) {
		return ''
	}

	return issueKey.split('-')[0] ?? ''
}

function toDateKey(date: DateTime): string {
	return date.toISODate() ?? ''
}

function upsertGroup(
	map: Map<string, WorklogStatsGroupEntry>,
	key: string,
	label: string,
	durationSeconds: number,
	meta: Record<string, string>
): void {
	const entry = map.get(key)
	if (entry) {
		entry.totalSeconds += durationSeconds
		entry.entryCount += 1
		entry.meta = { ...entry.meta, ...meta }
		return
	}

	map.set(key, {
		key,
		label,
		totalSeconds: durationSeconds,
		entryCount: 1,
		meta
	})
}

function sortGroupEntries(map: Map<string, WorklogStatsGroupEntry>): WorklogStatsGroupEntry[] {
	return Array.from(map.values()).sort((a, b) => {
		if (b.totalSeconds === a.totalSeconds) {
			return b.entryCount - a.entryCount
		}

		return b.totalSeconds - a.totalSeconds
	})
}

function sortDayEntries(
	map: Map<string, WorklogStatsGroupEntry & { date: Date }>
): Array<WorklogStatsGroupEntry & { date: Date }> {
	return Array.from(map.values()).sort(
		(a, b) => DateTime.fromJSDate(b.date).toMillis() - DateTime.fromJSDate(a.date).toMillis()
	)
}
