/**
 * Authentication error codes.
 * - UNAUTHENTICATED: User is not logged in or session is invalid
 * - FORBIDDEN: User is authenticated but lacks required permissions
 */
export type AuthErrorCode = 'UNAUTHENTICATED' | 'FORBIDDEN'

/**
 * Custom error class for authentication failures.
 * Carries a code to distinguish between unauthenticated (401) and forbidden (403) cases.
 */
export class AuthError extends Error {
	readonly code: AuthErrorCode

	constructor(code: AuthErrorCode, message?: string) {
		super(message ?? (code === 'UNAUTHENTICATED' ? 'Unauthorized' : 'Forbidden'))
		this.code = code
		this.name = 'AuthError'
	}

	/**
	 * Creates an AuthError for unauthenticated state.
	 */
	static unauthenticated(message?: string): AuthError {
		return new AuthError('UNAUTHENTICATED', message)
	}

	/**
	 * Creates an AuthError for forbidden state.
	 */
	static forbidden(message?: string): AuthError {
		return new AuthError('FORBIDDEN', message)
	}
}
