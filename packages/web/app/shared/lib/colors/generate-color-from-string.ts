import { invariant } from '~/lib/util/index.ts'
import { PASTEL_COLORS } from './pastel-palette.ts'

/**
 * Generate a consistent pastel color for a given string (project name, user name, etc.)
 * Uses predefined palette for consistent, pleasant colors
 */
export function generateColorFromString(str: string): {
	backgroundColor: string
	textColor: string
	borderColor: string
} {
	// Simple hash function to generate a number from a string
	let hash = 0
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash)
		hash = hash & hash // Convert to 32bit integer
	}

	// Select color from palette based on hash
	const colorIndex = Math.abs(hash) % PASTEL_COLORS.length
	const color = PASTEL_COLORS[colorIndex]
	invariant(color, 'Color generation failed')

	return {
		backgroundColor: color.bg,
		textColor: color.text,
		borderColor: color.border
	}
}
