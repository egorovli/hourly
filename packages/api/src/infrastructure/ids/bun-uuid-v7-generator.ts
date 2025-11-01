import type { IdGenerator } from '../../core/services/id-generator.ts'

import { injectable } from 'inversify'

/**
 * BunUuidV7Generator - ID generator using Bun.randomUUIDv7().
 *
 * Provides monotonic UUIDv7 identifiers with good locality for storage.
 */
@injectable()
export class BunUuidV7Generator implements IdGenerator {
	generate(): string {
		return Bun.randomUUIDv7()
	}
}
