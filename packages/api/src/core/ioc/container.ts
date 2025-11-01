import type { TypedContainer } from '@inversifyjs/strongly-typed'

import { Container as InversifyContainer } from 'inversify'

import type { BindingMap } from './binding-map.ts'

/**
 * Typed container instance with compile-time type safety
 *
 * Uses type assertion to keep @inversifyjs/strongly-typed out of the runtime
 * dependency tree while still providing full type safety.
 *
 * @see https://inversify.io/docs/ecosystem/strongly-typed/
 */
export const container = new InversifyContainer() as TypedContainer<BindingMap>

// Re-export BindingMap for use in container modules
export type { BindingMap }
