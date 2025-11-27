import type { JiraUser, JiraWorklog } from './client.ts'

import type { WorklogAuthor } from '~/domain/entities/worklog-author.ts'
import type { WorklogEntity } from '~/domain/entities/worklog-entity.ts'

/**
 * Maps a Jira user to a domain WorklogAuthor entity
 */
export function mapJiraUserToWorklogAuthor(jiraUser: JiraUser): WorklogAuthor {
	const avatarUrl =
		jiraUser.avatarUrls?.['48x48'] ??
		jiraUser.avatarUrls?.['32x32'] ??
		jiraUser.avatarUrls?.['24x24'] ??
		jiraUser.avatarUrls?.['16x16']

	return {
		id: jiraUser.accountId,
		name: jiraUser.displayName,
		email: jiraUser.emailAddress,
		avatarUrl,
		isActive: jiraUser.active
	}
}

/**
 * Maps a Jira worklog to a domain WorklogEntity
 */
export function mapJiraWorklogToWorklogEntity(jiraWorklog: JiraWorklog): WorklogEntity {
	const startedAt = new Date(jiraWorklog.started)
	const finishedAt = new Date(startedAt.getTime() + jiraWorklog.timeSpentSeconds * 1000)

	return {
		id: jiraWorklog.id,
		startedAt,
		finishedAt,
		author: {
			id: jiraWorklog.author.accountId,
			name: jiraWorklog.author.displayName
		}
	}
}
