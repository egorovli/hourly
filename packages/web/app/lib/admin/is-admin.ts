/**
 * Creates a compound profile ID in the format `{id}@{provider}`.
 */
export function createCompoundProfileId(profileId: string, provider: string): string {
	return `${profileId}@${provider}`
}

/**
 * Parses the `ADMIN_PROFILE_IDS` environment variable into a Set of compound profile IDs.
 * Expected format: comma-separated compound IDs (e.g., "id1@atlassian,id2@gitlab")
 */
export function parseAdminProfileIds(): Set<string> {
	const envValue = process.env['ADMIN_PROFILE_IDS']

	if (typeof envValue !== 'string' || envValue.trim() === '') {
		return new Set()
	}

	const ids = envValue
		.split(',')
		.map(id => id.trim())
		.filter(id => id.length > 0)

	return new Set(ids)
}

/**
 * Checks if a profile is an admin based on the `ADMIN_PROFILE_IDS` environment variable.
 */
export function isAdmin(profileId: string, provider: string): boolean {
	const adminIds = parseAdminProfileIds()
	const compoundId = createCompoundProfileId(profileId, provider)

	return adminIds.has(compoundId)
}
