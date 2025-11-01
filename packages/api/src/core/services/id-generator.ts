/**
 * IdGenerator - Identifier Generation Service Interface
 *
 * Provides an abstraction for generating unique identifiers so that different
 * transports or environments can plug in custom strategies (e.g., Bun UUID v7,
 * ULIDs, deterministic test doubles).
 */
export interface IdGenerator {
	/**
	 * Generates a new unique identifier.
	 */
	generate(): string
}
