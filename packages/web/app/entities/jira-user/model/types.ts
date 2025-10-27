import type { loader as jiraUsersLoader } from '~/routes/jira.users.tsx'

/**
 * Jira user data from API loader
 * Re-exported for entity layer usage
 */
export type JiraUsersData = Awaited<ReturnType<typeof jiraUsersLoader>>
