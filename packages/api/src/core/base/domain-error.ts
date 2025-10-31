export abstract class DomainError extends Error {
	constructor(
		message: string,
		readonly details?: unknown
	) {
		super(message)
		this.name = this.constructor.name
	}
}
