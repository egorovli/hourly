import type { State } from './state.ts'
import type { Action } from './actions.ts'

export function reducer(state: State, action: Action): State {
	switch (action.type) {
		case 'selectedJiraProjectIds.select':
			return {
				...state,
				selectedJiraProjectIds: action.payload,
				selectedJiraUserIds: []
			}

		case 'selectedJiraUserIds.select':
			return {
				...state,
				selectedJiraUserIds: action.payload
			}

		case 'selectedGitlabProjectIds.select':
			return {
				...state,
				selectedGitlabProjectIds: action.payload,
				selectedGitlabContributorIds: []
			}

		case 'selectedGitlabContributorIds.select':
			return {
				...state,
				selectedGitlabContributorIds: action.payload
			}

		case 'dateRange.select':
			return {
				...state,
				dateRange: action.payload
			}

		case 'calendarViewDateRange.select':
			return {
				...state,
				calendarViewDateRange: action.payload
			}

		case 'worklog.setLoaded': {
			const loadedMap = new Map<
				string,
				(typeof state)['localWorklogEntries'] extends Map<string, infer T> ? T : never
			>()
			for (const entry of action.payload) {
				loadedMap.set(entry.localId, entry)
			}
			return {
				...state,
				loadedWorklogEntries: loadedMap,
				localWorklogEntries: new Map(loadedMap)
			}
		}

		case 'worklog.create': {
			const newEntry = {
				...action.payload,
				localId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
				isNew: true
			}
			const nextLocal = new Map(state.localWorklogEntries)
			nextLocal.set(newEntry.localId, newEntry)
			return {
				...state,
				localWorklogEntries: nextLocal
			}
		}

		case 'worklog.update': {
			const nextLocal = new Map(state.localWorklogEntries)
			nextLocal.set(action.payload.localId, action.payload)
			return {
				...state,
				localWorklogEntries: nextLocal
			}
		}

		case 'worklog.delete': {
			const nextLocal = new Map(state.localWorklogEntries)
			nextLocal.delete(action.payload)
			return {
				...state,
				localWorklogEntries: nextLocal
			}
		}

		case 'worklog.apply': {
			return {
				...state,
				loadedWorklogEntries: new Map(state.localWorklogEntries)
			}
		}

		case 'worklog.revert': {
			return {
				...state,
				localWorklogEntries: new Map(state.loadedWorklogEntries)
			}
		}

		default:
			return state
	}
}
