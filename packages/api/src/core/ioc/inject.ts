import { inject, multiInject } from 'inversify'
import type { TypedInject, TypedMultiInject } from '@inversifyjs/strongly-typed'

import type { BindingMap } from './binding-map.ts'

/**
 * Strongly-typed @inject decorator for constructor and property injection
 *
 * Provides compile-time type safety for dependency injection, ensuring
 * that injected types match the parameter or property types.
 *
 * @example
 * ```typescript
 * @injectable()
 * class MyService {
 *   constructor(
 *     @$inject(InjectionKey.WorklogEntryRepository)
 *     private readonly repository: WorklogEntryRepository
 *   ) {}
 * }
 * ```
 *
 * @see https://inversify.io/docs/ecosystem/strongly-typed/
 */
export const $inject = inject as TypedInject<BindingMap>

/**
 * Strongly-typed @multiInject decorator for multiple bindings
 *
 * @see https://inversify.io/docs/ecosystem/strongly-typed/
 */
export const $multiInject = multiInject as TypedMultiInject<BindingMap>
