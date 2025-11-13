/** biome-ignore-all lint/style/noDefaultExport: It's fine in this case */
/** biome-ignore-all lint/style/noProcessEnv: It's fine in this case */

import type { Options } from '@mikro-orm/postgresql'

import fs from 'node:fs'
import path from 'node:path'

import { PostgreSqlDriver, GeneratedCacheAdapter } from '@mikro-orm/postgresql'
import { TsMorphMetadataProvider } from '@mikro-orm/reflection'
import { SqlHighlighter } from '@mikro-orm/sql-highlighter'

import * as entities from './entities/index.ts'

const __dirname = path.resolve(import.meta.dirname)
const projectRoot = path.resolve(__dirname, '../../..')
const metadataFilepath = path.resolve(projectRoot, './temp/metadata.json')

export const config: Options = {
	driver: PostgreSqlDriver,
	clientUrl: process.env.DATABASE_URL,

	entities: [entities.Profile, entities.Session, entities.Token],

	discovery: {
		requireEntitiesArray: true
	},

	forceUndefined: true,
	forceUtcTimezone: true,

	...(process.env.NODE_ENV === 'production' && fs.existsSync(metadataFilepath)
		? {
				metadataCache: {
					enabled: true,
					adapter: GeneratedCacheAdapter,
					options: {
						data: JSON.parse(fs.readFileSync(metadataFilepath, { encoding: 'utf8' }))
					}
				}
			}
		: {
				metadataProvider: TsMorphMetadataProvider,
				metadataCache: {
					enabled: false
				}
			}),

	...(process.env.NODE_ENV === 'development'
		? {
				debug: true,
				highlighter: new SqlHighlighter()
			}
		: {}),

	dynamicImportProvider: async id => import(/* @vite-ignore */ id)
}

export default config
