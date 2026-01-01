export const PROJECT_AVATAR_SIZES = ['16x16', '24x24', '32x32', '48x48'] as const

export type ProjectAvatarUrls = Record<string, string>

export interface ProjectCategory {
	id: string
	name: string
	description: string
	self: string
}

export interface ProjectInsight {
	lastIssueUpdateTime: number
	totalIssueCount: number
}

/**
 * GET /rest/api/3/project
 */
export interface Project {
	archived?: boolean
	self: string
	id: string
	key: string
	name: string
	avatarUrls: ProjectAvatarUrls
	projectTypeKey: string
	simplified: boolean
	style: string
	favourite?: boolean
	isPrivate?: boolean
	entityId?: string
	uuid?: string
	projectCategory?: ProjectCategory
	insight?: ProjectInsight
	description?: string
	leadAccountId?: string
}
