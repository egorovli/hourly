import type { loader as gitlabContributorsLoader } from '~/routes/gitlab.contributors.tsx'

/**
 * GitLab contributor data from API loader
 * Re-exported for entity layer usage
 */
export type GitlabContributorsData = Awaited<ReturnType<typeof gitlabContributorsLoader>>
