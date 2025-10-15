import type { SessionUser } from './storage.ts'

/**
 * Calculate session expiration based on the shortest token expiration
 * Returns a Date object representing when the session should expire
 */
export function calculateSessionExpiration(user: SessionUser): Date | undefined {
	const expirations: Date[] = []

	// Collect all token expiration dates
	if (user.atlassian?.tokenExpiresAt) {
		expirations.push(new Date(user.atlassian.tokenExpiresAt))
	}

	if (user.gitlab?.tokenExpiresAt) {
		expirations.push(new Date(user.gitlab.tokenExpiresAt))
	}

	// If no expirations found, return undefined (no expiration)
	if (expirations.length === 0) {
		return undefined
	}

	// Return the earliest expiration date (shortest token expiration)
	return new Date(Math.min(...expirations.map(d => d.getTime())))
}

/**
 * Check if both providers are authenticated
 */
export function isFullyAuthenticated(user?: SessionUser): boolean {
	if (!user) {
		return false
	}

	return user.atlassian !== undefined && user.gitlab !== undefined
}

/**
 * Get which providers are connected
 */
export function getConnectedProviders(user?: SessionUser): {
	atlassian: boolean
	gitlab: boolean
} {
	return {
		atlassian: Boolean(user?.atlassian),
		gitlab: Boolean(user?.gitlab)
	}
}
