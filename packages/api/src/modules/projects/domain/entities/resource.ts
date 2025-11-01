import { ValidationError } from '../../../../core/errors/validation-error.ts'

export interface ResourceInit {
	id: string
	name: string
	url: string
	avatarUrl?: string
	scopes?: string[]
}

export class Resource {
	readonly id: string
	readonly name: string
	readonly url: string
	readonly avatarUrl?: string
	readonly scopes: string[]

	constructor(init: ResourceInit) {
		this.validate(init)

		this.id = init.id
		this.name = init.name
		this.url = init.url
		this.avatarUrl = init.avatarUrl
		this.scopes = init.scopes ?? []
	}

	matchesScope(scope: string): boolean {
		return this.scopes.includes(scope)
	}

	private validate(init: ResourceInit): void {
		if (typeof init.id !== 'string' || init.id.trim().length === 0) {
			throw new ValidationError('Resource id is required')
		}

		if (typeof init.name !== 'string' || init.name.trim().length === 0) {
			throw new ValidationError('Resource name is required')
		}

		if (typeof init.url !== 'string' || init.url.trim().length === 0) {
			throw new ValidationError('Resource url is required')
		}
	}
}
