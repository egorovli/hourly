import type { Preferences } from '~/domain/preferences.ts'

export interface WorklogsPageLoaderData {
	user: {
		atlassian?: {
			id: string
			email?: string
		}
		gitlab?: {
			id: string
			username?: string
		}
	}
	preferences?: Partial<Preferences>
}

export interface WorklogsPageProps {
	loaderData: WorklogsPageLoaderData
}
