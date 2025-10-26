/** biome-ignore-all lint/style/noDefaultExport: It's fine in this case */
/** biome-ignore-all lint/style/noProcessEnv: It's fine in this case */

import type { Options } from '@mikro-orm/sqlite'

import fs from 'node:fs'
import path from 'node:path'

import { SqliteDriver, GeneratedCacheAdapter } from '@mikro-orm/sqlite'
import { TsMorphMetadataProvider } from '@mikro-orm/reflection'
import { SqlHighlighter } from '@mikro-orm/sql-highlighter'

import { Profile, Session, Token } from './entities/index.ts'

const databaseRelativePath =
	process.env.DATABASE_URL?.replace('sqlite:', '') || './data/database.sqlite3'

const __dirname = path.resolve(import.meta.dirname)
const projectRoot = path.resolve(__dirname, '../../..')
const metadataFilepath = path.resolve(projectRoot, './db/.tmp/metadata.json')
const databaseFilepath = path.resolve(projectRoot, databaseRelativePath)

export const config: Options = {
	driver: SqliteDriver,
	dbName: databaseFilepath,

	entities: [Profile, Session, Token],

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

	dynamicImportProvider: async id => import(id),
	debug: false
}

export default config
