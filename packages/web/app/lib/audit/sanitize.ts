/**
 * Sanitization utilities for audit log data to prevent log injection
 * and sensitive data exposure.
 */

const SENSITIVE_KEYS = [
	'password',
	'token',
	'secret',
	'key',
	'authorization',
	'cookie',
	'credential'
]
const MAX_STRING_LENGTH = 1000
const MAX_USER_AGENT_LENGTH = 500

/**
 * Sanitize action description to prevent log injection.
 * Removes newlines and truncates to max length.
 */
export function sanitizeActionDescription(input: string): string {
	return input.replace(/[\n\r\t]/g, ' ').substring(0, MAX_STRING_LENGTH)
}

/**
 * Sanitize user agent string.
 * Truncates to max length and handles null/undefined.
 */
export function sanitizeUserAgent(input: string | null | undefined): string | undefined {
	if (input === null || input === undefined) {
		return undefined
	}
	return input.substring(0, MAX_USER_AGENT_LENGTH)
}

/**
 * Check if a key is sensitive based on its name.
 */
function isSensitiveKey(key: string): boolean {
	const lowerKey = key.toLowerCase()
	return SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive))
}

/**
 * Sanitize metadata object to redact sensitive fields and truncate long strings.
 * Creates a shallow copy with redactions applied.
 */
export function sanitizeMetadata(input: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {}

	for (const [key, value] of Object.entries(input)) {
		if (isSensitiveKey(key)) {
			result[key] = '[REDACTED]'
		} else if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
			result[key] = `${value.substring(0, MAX_STRING_LENGTH)}...`
		} else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
			// Recursively sanitize nested objects
			result[key] = sanitizeMetadata(value as Record<string, unknown>)
		} else {
			result[key] = value
		}
	}

	return result
}

/**
 * Sanitize IP address (optional for GDPR compliance).
 * Can be configured to mask last octet for IPv4.
 */
export function sanitizeIpAddress(
	ip: string | undefined,
	maskLastOctet = false
): string | undefined {
	if (!ip) {
		return undefined
	}

	if (!maskLastOctet) {
		return ip
	}

	// Mask last octet for IPv4 addresses
	if (ip.includes('.') && !ip.includes(':')) {
		const parts = ip.split('.')
		if (parts.length === 4) {
			return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`
		}
	}

	// For IPv6, mask the last segment
	if (ip.includes(':')) {
		const lastColonIndex = ip.lastIndexOf(':')
		if (lastColonIndex !== -1) {
			return `${ip.substring(0, lastColonIndex)}:xxxx`
		}
	}

	return ip
}
