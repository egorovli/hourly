import { RequestContext } from '@mikro-orm/core'

import { orm } from './orm.ts'

/**
 * Higher-order function that wraps any async function with MikroORM RequestContext.
 * This ensures the EntityManager is available via RequestContext.getEntityManager()
 * throughout the execution of the wrapped function.
 *
 * @example
 * ```ts
 * const wrappedFn = withRequestContext(async (a: string, b: number) => {
 *   const em = RequestContext.getEntityManager()
 *   // ... use em
 *   return a + b
 * })
 * ```
 */
export function withRequestContext<TArgs extends unknown[], TReturn>(
	fn: (...args: TArgs) => Promise<TReturn> | TReturn
): (...args: TArgs) => Promise<TReturn> | TReturn {
	return (...args: TArgs) => {
		return RequestContext.create(orm.em, async () => {
			return fn(...args)
		})
	}
}
