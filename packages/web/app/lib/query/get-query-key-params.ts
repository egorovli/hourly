import { invariant } from '../util/index.ts'

export function getQueryKeyParams<Q>(queryKey: Q): Q extends (string | infer T)[] ? T : never {
	invariant(Array.isArray(queryKey), 'Query key must be an array')
	invariant(queryKey.length > 0, 'Query key must have at least one element')

	const last = queryKey[queryKey.length - 1]
	invariant(typeof last === 'object' && last !== null, 'Query key must have at least one element')

	return last as Q extends (string | infer T)[] ? T : never
}
