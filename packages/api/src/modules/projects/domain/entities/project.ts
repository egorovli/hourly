import type { ProjectProvider } from '../value-objects/project-provider.ts'

import { ValidationError } from '../../../../core/errors/validation-error.ts'
import { isProjectProvider } from '../value-objects/project-provider.ts'

export interface ProjectInit {
	id: string
	key: string
	name: string
	resourceId: string
	provider: ProjectProvider
	lastActivityAt?: string
	archived?: boolean
}

export class Project {
	readonly id: string
	readonly key: string
	readonly name: string
	readonly resourceId: string
	readonly provider: ProjectProvider
	readonly lastActivityAt?: string
	readonly archived?: boolean

	constructor(init: ProjectInit) {
		this.validate(init)

		this.id = init.id
		this.key = init.key
		this.name = init.name
		this.resourceId = init.resourceId
		this.provider = init.provider
		this.lastActivityAt = init.lastActivityAt
		this.archived = init.archived
	}

	private validate(init: ProjectInit): void {
		if (typeof init.id !== 'string' || init.id.trim().length === 0) {
			throw new ValidationError('Project id is required')
		}

		if (typeof init.key !== 'string' || init.key.trim().length === 0) {
			throw new ValidationError('Project key is required')
		}

		if (typeof init.name !== 'string' || init.name.trim().length === 0) {
			throw new ValidationError('Project name is required')
		}

		if (typeof init.resourceId !== 'string' || init.resourceId.trim().length === 0) {
			throw new ValidationError('Project resource id is required')
		}

		if (!isProjectProvider(init.provider)) {
			throw new ValidationError('Project provider is invalid')
		}
	}
}
