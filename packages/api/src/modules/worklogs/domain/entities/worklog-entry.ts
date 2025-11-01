import { ValidationError } from '../../../../core/errors/validation-error.ts'

export interface WorklogEntryInit {
	id: string
	issueKey: string
	issueId: string
	summary: string
	projectId: string
	authorAccountId: string
	started: string
	timeSpentSeconds: number
}

export class WorklogEntry {
	readonly id: string
	readonly issueKey: string
	readonly issueId: string
	readonly summary: string
	readonly projectId: string
	readonly authorAccountId: string
	readonly started: string
	readonly timeSpentSeconds: number

	constructor(init: WorklogEntryInit) {
		this.validate(init)

		this.id = init.id
		this.issueKey = init.issueKey
		this.issueId = init.issueId
		this.summary = init.summary
		this.projectId = init.projectId
		this.authorAccountId = init.authorAccountId
		this.started = init.started
		this.timeSpentSeconds = init.timeSpentSeconds
	}

	private validate(init: WorklogEntryInit): void {
		this.validateRequiredString(init.id, 'Worklog entry id')
		this.validateRequiredString(init.issueKey, 'Issue key')
		this.validateRequiredString(init.issueId, 'Issue id')
		this.validateRequiredString(init.projectId, 'Project id')
		this.validateRequiredString(init.authorAccountId, 'Author account id')
		this.validateRequiredString(init.started, 'Started date')

		if (typeof init.summary !== 'string') {
			throw new ValidationError('Summary is required')
		}

		if (!isValidIsoDateTime(init.started)) {
			throw new ValidationError('Started date must be a valid ISO 8601 datetime string')
		}

		if (typeof init.timeSpentSeconds !== 'number' || !Number.isInteger(init.timeSpentSeconds)) {
			throw new ValidationError('Time spent seconds must be an integer')
		}

		if (init.timeSpentSeconds <= 0) {
			throw new ValidationError('Time spent seconds must be positive')
		}
	}

	private validateRequiredString(value: unknown, fieldName: string): void {
		if (typeof value !== 'string' || value.trim().length === 0) {
			throw new ValidationError(`${fieldName} is required`)
		}
	}
}

function isValidIsoDateTime(value: string): boolean {
	try {
		const date = new Date(value)
		return !Number.isNaN(date.getTime()) && value.includes('T')
	} catch {
		return false
	}
}
