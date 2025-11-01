import type { ProjectProvider } from '../value-objects/project-provider.ts'

import { ValidationError } from '../../../../core/errors/validation-error.ts'
import { isProjectProvider } from '../value-objects/project-provider.ts'

export interface JiraProjectDetails {
	url?: string
	avatarUrl?: string
	projectTypeKey?: string
	simplified?: boolean
	style?: string
	isPrivate?: boolean
	description?: string
}

export interface ProjectProps {
	id: string
	key: string
	name: string
	resourceId: string
	provider: ProjectProvider
	lastActivityAt?: string
	archived?: boolean
	jira?: JiraProjectDetails
}

export class Project {
	private readonly props: ProjectProps

	constructor(props: ProjectProps) {
		const normalizedId = props.id?.trim()
		const normalizedKey = props.key?.trim()
		const normalizedName = props.name?.trim()
		const normalizedResourceId = props.resourceId?.trim()

		this.props = {
			...props,
			id: normalizedId ?? '',
			key: normalizedKey ?? '',
			name: normalizedName ?? '',
			resourceId: normalizedResourceId ?? '',
			jira: this.normalizeJiraDetails(props.jira)
		}

		this.validate()
	}

	get id(): string {
		return this.props.id
	}

	get key(): string {
		return this.props.key
	}

	get name(): string {
		return this.props.name
	}

	get provider(): ProjectProvider {
		return this.props.provider
	}

	get resourceId(): string {
		return this.props.resourceId
	}

	get lastActivityAt(): string | undefined {
		return this.props.lastActivityAt
	}

	get isArchived(): boolean {
		return Boolean(this.props.archived)
	}

	get jiraDetails(): JiraProjectDetails | undefined {
		return this.props.jira
	}

	get avatarUrl(): string | undefined {
		return this.props.jira?.avatarUrl
	}

	get url(): string | undefined {
		return this.props.jira?.url
	}

	get projectTypeKey(): string | undefined {
		return this.props.jira?.projectTypeKey
	}

	get isSimplified(): boolean {
		return Boolean(this.props.jira?.simplified)
	}

	get style(): string | undefined {
		return this.props.jira?.style
	}

	get isPrivate(): boolean {
		return Boolean(this.props.jira?.isPrivate)
	}

	get description(): string | undefined {
		return this.props.jira?.description
	}

	matchesKey(key: string): boolean {
		return this.props.key.toLowerCase() === key.trim().toLowerCase()
	}

	matchesName(name: string): boolean {
		return this.props.name.toLowerCase() === name.trim().toLowerCase()
	}

	belongsToResource(resourceId: string): boolean {
		return this.props.resourceId === resourceId.trim()
	}

	private normalizeJiraDetails(details?: JiraProjectDetails): JiraProjectDetails | undefined {
		if (!details) {
			return undefined
		}

		return {
			...details,
			url: details.url?.trim(),
			avatarUrl: details.avatarUrl?.trim(),
			projectTypeKey: details.projectTypeKey?.trim(),
			style: details.style?.trim(),
			description: details.description?.trim()
		}
	}

	private validate(): void {
		if (!this.props.id) {
			throw new ValidationError('Project id is required')
		}

		if (!this.props.key) {
			throw new ValidationError('Project key is required')
		}

		if (!this.props.name) {
			throw new ValidationError('Project name is required')
		}

		if (!this.props.resourceId) {
			throw new ValidationError('Project resource id is required')
		}

		if (!isProjectProvider(this.props.provider)) {
			throw new ValidationError('Project provider is invalid')
		}
	}
}
