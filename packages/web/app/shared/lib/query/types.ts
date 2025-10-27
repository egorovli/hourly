/**
 * Type helper to infer query key parameters from TanStack Query queryKey tuple
 */
export type InferQueryKeyParams<T> = T extends readonly [string | infer _Prefix, infer U]
	? [string, U]
	: never
