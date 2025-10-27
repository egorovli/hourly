import type { loader as gitlabProjectsLoader } from '~/routes/gitlab.projects.tsx'

/**
 * GitLab project data from API loader
 * Re-exported for entity layer usage
 */
export type GitlabProjectsData = Awaited<ReturnType<typeof gitlabProjectsLoader>>
