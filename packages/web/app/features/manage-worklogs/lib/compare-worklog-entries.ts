import type { LocalWorklogEntry, WorklogChanges } from '~/entities/index.ts'

export function compareWorklogEntries(
	loaded: Map<string, LocalWorklogEntry>,
	local: Map<string, LocalWorklogEntry>
): WorklogChanges {
	const newEntries: LocalWorklogEntry[] = []
	const modifiedEntries: LocalWorklogEntry[] = []
	const deletedEntries: LocalWorklogEntry[] = []

	for (const [localId, localEntry] of local) {
		const loadedEntry = loaded.get(localId)
		if (loadedEntry) {
			const isModified =
				localEntry.issueKey !== loadedEntry.issueKey ||
				localEntry.started !== loadedEntry.started ||
				localEntry.timeSpentSeconds !== loadedEntry.timeSpentSeconds ||
				localEntry.summary !== loadedEntry.summary
			if (isModified) {
				modifiedEntries.push(localEntry)
			}
		} else {
			newEntries.push(localEntry)
		}
	}

	for (const [localId, loadedEntry] of loaded) {
		if (!local.has(localId)) {
			deletedEntries.push(loadedEntry)
		}
	}

	return {
		newEntries,
		modifiedEntries,
		deletedEntries,
		hasChanges: newEntries.length > 0 || modifiedEntries.length > 0 || deletedEntries.length > 0,
		changeCount: newEntries.length + modifiedEntries.length + deletedEntries.length
	}
}
