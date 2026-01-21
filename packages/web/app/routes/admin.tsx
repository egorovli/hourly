import type { Route } from './+types/admin.ts'

import { Outlet } from 'react-router'

import { AdminForbidden } from '~/components/admin/admin-forbidden.tsx'
import { AdminSidebar } from '~/components/admin/admin-sidebar.tsx'
import { SidebarInset, SidebarProvider } from '~/components/shadcn/ui/sidebar.tsx'
import { ProfileConnectionType } from '~/domain/index.ts'
import { isAdmin } from '~/lib/admin/index.ts'
import {
	orm,
	ProfileSessionConnection,
	Session,
	withRequestContext
} from '~/lib/mikro-orm/index.ts'
import { createSessionStorage } from '~/lib/session/index.ts'

export const loader = withRequestContext(async function loader({ request }: Route.LoaderArgs) {
	const { em } = orm

	const sessionStorage = createSessionStorage()
	const cookieSession = await sessionStorage.getSession(request.headers.get('Cookie'))

	if (!cookieSession?.id) {
		throw new Response('Unauthorized', { status: 401 })
	}

	const session = await em.findOne(Session, {
		id: cookieSession.id
	})

	if (!session) {
		throw new Response('Unauthorized', { status: 401 })
	}

	const connection = await em.findOne(
		ProfileSessionConnection,
		{
			session: {
				id: session.id
			},
			connectionType: ProfileConnectionType.WorklogTarget
		},
		{
			populate: ['profile']
		}
	)

	if (!connection) {
		throw new Response('Unauthorized', { status: 401 })
	}

	const { profile } = connection

	if (!isAdmin(profile.id, profile.provider)) {
		throw new Response('Forbidden', { status: 403 })
	}

	return {
		profile: {
			id: profile.id,
			provider: profile.provider
		}
	}
})

export default function AdminLayout({ loaderData }: Route.ComponentProps): React.ReactNode {
	return (
		<SidebarProvider>
			<AdminSidebar />
			<SidebarInset>
				<Outlet />
			</SidebarInset>
		</SidebarProvider>
	)
}

export function ErrorBoundary(): React.ReactNode {
	return <AdminForbidden />
}
