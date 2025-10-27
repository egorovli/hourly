import type { loader as jiraProjectsLoader } from '~/routes/jira.projects.tsx'

/**
 * Jira project data from API loader
 * Re-exported for entity layer usage
 */
export type JiraProjectsData = Awaited<ReturnType<typeof jiraProjectsLoader>>
