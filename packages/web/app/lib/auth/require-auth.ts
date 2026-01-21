import type { AuthContext } from './auth-context.ts'

import { redirect } from 'react-router'

import { ProfileConnectionType } from '~/domain/index.ts'
import { isAdmin } from '~/lib/admin/index.ts'
import { AtlassianClient } from '~/lib/atlassian/index.ts'
import { auditActions, getAuditLogger } from '~/lib/audit/index.ts'
import { orm, ProfileSessionConnection, Session, Token } from '~/lib/mikro-orm/index.ts'
import { createSessionStorage } from '~/lib/session/index.ts'

import { AuthError } from './auth-error.ts'

/**
 * Core function that retrieves the authentication context from a request.
 * Throws AuthError on failure, allowing callers to handle errors as needed.
 * Logs authentication failures to the audit log when available.
 */
export async function requireAuth(request: Request): Promise<AuthContext> {
	const auditLogger = getAuditLogger()
	const { em } = orm
	const sessionStorage = createSessionStorage()
	const cookieSession = await sessionStorage.getSession(request.headers.get('Cookie'))

	if (!cookieSession?.id) {
		auditLogger?.log(auditActions.auth.noSessionCookie())
		throw AuthError.unauthenticated()
	}

	const session = await em.findOne(Session, { id: cookieSession.id })
	if (!session) {
		auditLogger?.log(auditActions.auth.sessionNotFound(cookieSession.id))
		throw AuthError.unauthenticated()
	}

	const connection = await em.findOne(
		ProfileSessionConnection,
		{
			session: { id: session.id },
			connectionType: ProfileConnectionType.WorklogTarget
		},
		{ populate: ['profile'] }
	)

	if (!connection) {
		auditLogger?.log(auditActions.auth.noProfileConnection())
		throw AuthError.unauthenticated()
	}

	const { profile } = connection

	const token = await em.findOne(Token, {
		profileId: profile.id,
		provider: profile.provider
	})

	if (!token) {
		auditLogger?.log(auditActions.auth.noToken(profile.id))
		throw AuthError.unauthenticated()
	}

	// Check if token has expired
	if (token.expiresAt && token.expiresAt <= new Date()) {
		auditLogger?.log(auditActions.auth.tokenExpired(profile.id, profile.provider))
		throw AuthError.unauthenticated('Token has expired')
	}

	// Set actor for subsequent audit logs
	auditLogger?.setActor(profile.id, profile.provider)

	const client = new AtlassianClient({ accessToken: token.accessToken })
	const admin = isAdmin(profile.id, profile.provider)

	return { profile, token, client, isAdmin: admin }
}

/**
 * For API routes: returns AuthContext or throws Response(401/403).
 * Use this in API resource routes that return JSON.
 */
export async function requireAuthOrRespond(request: Request): Promise<AuthContext> {
	try {
		return await requireAuth(request)
	} catch (error) {
		if (error instanceof AuthError) {
			const status = error.code === 'UNAUTHENTICATED' ? 401 : 403
			throw new Response(error.message, { status })
		}
		throw error
	}
}

/**
 * For page routes: returns AuthContext or redirects to sign-in.
 * Use this in page loaders that render HTML.
 */
export async function requireAuthOrRedirect(request: Request): Promise<AuthContext> {
	try {
		return await requireAuth(request)
	} catch (error) {
		if (error instanceof AuthError) {
			const url = new URL(request.url)
			const target =
				url.pathname === '/'
					? '/auth/sign-in'
					: `/auth/sign-in?redirected-from=${encodeURIComponent(url.pathname + url.search)}`
			throw redirect(target)
		}
		throw error
	}
}

/**
 * For admin routes: returns AuthContext or throws Response(401/403).
 * Checks both authentication and admin permission.
 * Logs authorization attempts to the audit log.
 */
export async function requireAdmin(request: Request): Promise<AuthContext> {
	const auditLogger = getAuditLogger()
	const auth = await requireAuthOrRespond(request)

	if (!auth.isAdmin) {
		auditLogger?.log(
			auditActions.authz.adminAccessDenied(
				auth.profile.id,
				auth.profile.provider,
				'User is not an admin'
			)
		)
		throw new Response('Forbidden', { status: 403 })
	}

	auditLogger?.log(auditActions.authz.adminAccessGranted())

	return auth
}

/**
 * For admin page routes: returns AuthContext or redirects to sign-in.
 * Checks both authentication and admin permission.
 * Logs authorization attempts to the audit log.
 */
export async function requireAdminOrRedirect(request: Request): Promise<AuthContext> {
	const auditLogger = getAuditLogger()

	try {
		const auth = await requireAuth(request)

		if (!auth.isAdmin) {
			auditLogger?.log(
				auditActions.authz.adminAccessDenied(
					auth.profile.id,
					auth.profile.provider,
					'User is not an admin'
				)
			)
			throw AuthError.forbidden('Admin access required')
		}

		auditLogger?.log(auditActions.authz.adminAccessGranted())
		return auth
	} catch (error) {
		if (error instanceof AuthError && error.code === 'UNAUTHENTICATED') {
			const url = new URL(request.url)
			throw redirect(`/auth/sign-in?redirected-from=${encodeURIComponent(url.pathname)}`)
		}
		throw error
	}
}
