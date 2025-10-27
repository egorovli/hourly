import type { loader as jiraProjectsLoader } from '~/routes/jira.projects.tsx'

export interface JiraProjectsSelectorProps {
	data: Awaited<ReturnType<typeof jiraProjectsLoader>>
	value: string[]
	onChange: (value: string[]) => void
}
