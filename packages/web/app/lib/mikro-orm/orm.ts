/** biome-ignore-all lint/style/noProcessEnv: It's fine in this case */

import { MikroORM } from '@mikro-orm/postgresql'

import { config } from './config.ts'

export let orm: ReturnType<typeof MikroORM.initSync>

declare const global: {
	__orm?: typeof orm
}

function createORM(): typeof orm {
	return MikroORM.initSync(config)
}

if (process.env.NODE_ENV === 'development') {
	global.__orm ??= createORM()
	orm = global.__orm
}

if (process.env.NODE_ENV !== 'development') {
	orm = createORM()
}
