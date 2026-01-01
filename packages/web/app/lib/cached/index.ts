import type { Redis } from 'ioredis'

import hash from 'object-hash'
import superjson from 'superjson'

import { redis as defaultRedis } from '../redis/index.ts'

superjson.registerCustom<Buffer, string>(
	{
		isApplicable(value): value is Buffer {
			return Buffer.isBuffer(value)
		},

		serialize(value) {
			return value.toString('base64')
		},

		deserialize(value) {
			return Buffer.from(value, 'base64')
		}
	},

	'Buffer'
)

export interface Options {
	ttl?: number | (() => number)
	client?: Redis
}

type CachedFactory = {
	<TArgs extends any[], R>(
		fn: (...args: TArgs) => R | Promise<R>,
		opt?: Options
	): (...args: TArgs) => Promise<R>

	key: (args: unknown | unknown[], name?: string) => string
	has: (key: string, client?: Redis) => Promise<boolean>
}

function toArgsArray(args: unknown | unknown[]): unknown[] {
	return Array.isArray(args) ? args : [args]
}

function getKey(args: unknown | unknown[], name = 'fn'): string {
	const hashed = hash(toArgsArray(args), { encoding: 'base64', algorithm: 'sha256' })
	return ['cache', name, hashed].join('::')
}

const factory: CachedFactory = Object.assign(
	function cached<T extends any[], R>(
		fn: (...args: T) => R | Promise<R>,
		opt?: Options
	): (...args: T) => Promise<R> {
		const client: Redis = opt?.client ?? defaultRedis

		return async function cachedFn(...args: T): Promise<R> {
			const ttl = typeof opt?.ttl === 'function' ? opt.ttl() : (opt?.ttl ?? 3 * 60)
			const key = getKey(args, fn.name)

			const cached = await client.get(key)

			if (typeof cached === 'string') {
				const remaining = await client.ttl(key)
				return superjson.parse(cached) as R
			}

			const result = await fn(...args)
			await client.setex(key, ttl, superjson.stringify(result))
			return result
		}
	},

	{
		key(args: unknown | unknown[], name = 'fn') {
			return getKey(args, name)
		},

		async has(key: string, client?: Redis): Promise<boolean> {
			const c = client ?? defaultRedis
			const exists = await c.exists(key)
			return exists === 1
		}
	}
)

export const cached = factory
