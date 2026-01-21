import type { Route } from './+types/admin.ts'

import { Outlet } from 'react-router'

import { AdminForbidden } from '~/components/admin/admin-forbidden.tsx'
import { AdminSidebar } from '~/components/admin/admin-sidebar.tsx'
import { SidebarInset, SidebarProvider } from '~/components/shadcn/ui/sidebar.tsx'
import { withAuditContext } from '~/lib/audit/index.ts'
import { requireAdmin } from '~/lib/auth/index.ts'

export const loader = withAuditContext(async function loader({ request }: Route.LoaderArgs) {
	const auth = await requireAdmin(request)

	return {
		profile: {
			id: auth.profile.id,
			provider: auth.profile.provider
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

export function ErrorBoundary({ error }: { error?: unknown }): React.ReactNode {
	// In development, show the actual error
	if (import.meta.env.DEV && error) {
		const message = error instanceof Error ? error.message : String(error)
		const stack = error instanceof Error ? error.stack : undefined
		return (
			<div className='p-8'>
				<h1 className='text-2xl font-bold text-red-500 mb-4'>Admin Error</h1>
				<pre className='bg-gray-100 p-4 rounded overflow-auto text-sm'>
					{message}
					{stack && `\n\n${stack}`}
				</pre>
			</div>
		)
	}
	return <AdminForbidden />
}
