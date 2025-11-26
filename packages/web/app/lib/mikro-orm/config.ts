/** biome-ignore-all lint/style/noDefaultExport: It's fine in this case */
/** biome-ignore-all lint/style/noProcessEnv: It's fine in this case */

import type { Options } from '@mikro-orm/postgresql'

import fs from 'node:fs'
import path from 'node:path'

import { PostgreSqlDriver, GeneratedCacheAdapter } from '@mikro-orm/postgresql'
import { TsMorphMetadataProvider } from '@mikro-orm/reflection'
import { SqlHighlighter } from '@mikro-orm/sql-highlighter'

import * as entities from './entities/index.ts'

/**
 * Resolves the metadata cache file path.
 * In production, the file is located at /app/packages/web/temp/metadata.json
 * We check multiple possible paths to handle different build scenarios.
 */
function resolveMetadataFilepath(): string | undefined {
	const cwd = process.cwd()
	const possiblePaths = [
		// Production: from /app working directory
		path.resolve(cwd, './packages/web/temp/metadata.json'),
		// Production: if running from packages/web directory
		path.resolve(cwd, './temp/metadata.json'),
		// Development: relative to config file location
		path.resolve(import.meta.dirname, '../../../temp/metadata.json'),
		// Fallback: absolute path based on common structure
		path.resolve('/app/packages/web/temp/metadata.json')
	]

	for (const filepath of possiblePaths) {
		if (fs.existsSync(filepath)) {
			return filepath
		}
	}

	return undefined
}

const metadataFilepath = resolveMetadataFilepath()
const isProduction = process.env.NODE_ENV === 'production'
const hasMetadataCache = metadataFilepath !== undefined

// Log metadata cache resolution in production for debugging
if (isProduction) {
	if (hasMetadataCache) {
		// biome-ignore lint/suspicious/noConsole: Production debugging for metadata cache resolution
		console.log(`[MikroORM] Using metadata cache from: ${metadataFilepath}`)
	} else {
		// biome-ignore lint/suspicious/noConsole: Production warning for missing metadata cache
		console.warn(
			'[MikroORM] Production mode detected but metadata cache file not found. Falling back to TsMorphMetadataProvider (this may fail if TypeScript sources are not available).'
		)
	}
} else {
	console.log('[MikroORM] Using TsMorphMetadataProvider for development mode')
}

export const config: Options = {
	driver: PostgreSqlDriver,
	clientUrl: process.env.DATABASE_URL,

	entities: [entities.Profile, entities.ProfileSessionConnection, entities.Session, entities.Token],

	discovery: {
		requireEntitiesArray: true
	},

	forceUndefined: true,
	forceUtcTimezone: true,

	...(isProduction && hasMetadataCache
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
