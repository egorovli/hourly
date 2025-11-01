import type { AuthController } from '../../../modules/auth/presentation/controllers/auth-controller.ts'

import { Elysia } from 'elysia'

import { registerAuthRoutes } from './auth-routes.ts'

export interface CreateElysiaAppOptions {
	authController: AuthController
}

/**
 * Builds an Elysia application configured with transport adapters.
 * External callers can pass alternative controllers or register additional routes.
 */
export function createElysiaApp(options: CreateElysiaAppOptions): Elysia {
	const app = new Elysia()

	registerAuthRoutes(app, options.authController)

	return app
}
