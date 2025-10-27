import type { loader as gitlabProjectsLoader } from '~/routes/gitlab.projects.tsx'

export interface GitlabProjectsSelectorProps {
	data: Awaited<ReturnType<typeof gitlabProjectsLoader>>
	value: string[]
	onChange: (value: string[]) => void
}
