export const PROJECT_PROVIDERS = ['jira'] as const

export type ProjectProvider = (typeof PROJECT_PROVIDERS)[number]

export function isProjectProvider(value: unknown): value is ProjectProvider {
	return typeof value === 'string' && PROJECT_PROVIDERS.includes(value as ProjectProvider)
}
