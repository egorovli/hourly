import type { loader as gitlabContributorsLoader } from '~/routes/gitlab.contributors.tsx'

export interface GitlabContributorsSelectorProps {
	data: Awaited<ReturnType<typeof gitlabContributorsLoader>>
	value: string[]
	onChange: (value: string[]) => void
}
