/** biome-ignore-all lint/style/noProcessEnv: It's fine in this case */

import { Redis } from 'ioredis'

// Singleton Redis client with dev-mode global caching to avoid reconnects on hot-reload
export let redis: Redis

declare global {
	// eslint-disable-next-line no-var
	var __redis: Redis | undefined
}

function createRedis(): Redis {
	const url = process.env.REDIS_URL
	return new Redis(url)
}

if (process.env.NODE_ENV === 'development') {
	global.__redis ??= createRedis()
	redis = global.__redis
} else {
	redis = createRedis()
}
