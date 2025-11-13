import { reactRouter } from '@react-router/dev/vite'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(config => ({
	plugins: [
		reactRouter(),
		tsconfigPaths(),

		svgr({
			svgrOptions: {
				plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx'],
				svgoConfig: {
					floatPrecision: 4
				}
			}
		})
	],

	ssr: {
		target: 'node'
	},

	server: {
		port: 3000
	},

	resolve: {
		alias: {
			...(config.command === 'build'
				? {
						'react-dom/server': 'react-dom/server.node'
					}
				: {})
		}
	},

	build: {
		// sourcemap: false,

		rollupOptions: {
			output: {
				manualChunks(id, meta) {
					if (/\/node_modules\//i.test(id)) {
						return 'vendor'
					}

					return undefined
				}
			}
		}
	}
}))
