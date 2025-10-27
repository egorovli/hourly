import type { loader as jiraUsersLoader } from '~/routes/jira.users.tsx'

export interface JiraUsersSelectorProps {
	data: Awaited<ReturnType<typeof jiraUsersLoader>>
	value: string[]
	onChange: (value: string[]) => void
}
