import type { Theme } from './theme.enum.ts'

export interface Preferences {
	theme?: Theme
	locale?: string
}
