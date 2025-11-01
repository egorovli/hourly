import { ValidationError } from '../../../../core/errors/validation-error.ts'

export interface ResourceProps {
	id: string
	name: string
	url: string
	scopes?: string[]
	avatarUrl?: string
}

export class Resource {
	private readonly props: ResourceProps

	constructor(props: ResourceProps) {
		const normalizedId = props.id?.trim()
		const normalizedName = props.name?.trim() ?? ''
		const normalizedUrl = props.url?.trim() ?? ''
		const normalizedAvatarUrl = props.avatarUrl?.trim()
		const uniqueScopes = props.scopes
			? Array.from(new Set(props.scopes.map(scope => scope.trim()).filter(Boolean)))
			: undefined

		this.props = {
			...props,
			id: normalizedId ?? '',
			name: normalizedName,
			url: normalizedUrl,
			avatarUrl: normalizedAvatarUrl,
			scopes: uniqueScopes
		}

		this.validate()
	}

	get id(): string {
		return this.props.id
	}

	get name(): string {
		return this.props.name
	}

	get url(): string {
		return this.props.url
	}

	get avatarUrl(): string | undefined {
		return this.props.avatarUrl
	}

	get scopes(): string[] {
		return this.props.scopes ?? []
	}

	matchesScope(scope: string): boolean {
		return this.scopes.includes(scope)
	}

	private validate(): void {
		if (!this.props.id) {
			throw new ValidationError('Resource id is required')
		}

		if (!this.props.name) {
			throw new ValidationError('Resource name is required')
		}

		if (!this.props.url) {
			throw new ValidationError('Resource url is required')
		}
	}
}
