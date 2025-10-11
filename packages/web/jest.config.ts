import type { Config } from 'jest'

import { createDefaultEsmPreset } from 'ts-jest'

export default async (): Promise<Config> => {
	let preset = createDefaultEsmPreset()

	return {
		...preset,

		testEnvironment: 'jsdom',
		setupFilesAfterEnv: ['<rootDir>/.jest/setup.ts'],
		moduleNameMapper: {
			'^~/(.*)$': '<rootDir>/app/$1',
			// svg:
			'\\.svg(?:\\?react)$': 'identity-obj-proxy'
		}
	}
}
