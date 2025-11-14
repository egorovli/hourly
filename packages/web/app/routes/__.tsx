import type React from 'react'
import type { Route } from './+types/__.ts'

import { Outlet, redirect } from 'react-router'

import { AppSidebar } from '~/components/shadcn/blocks/sidebar/index.tsx'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '~/components/shadcn/ui/sidebar.tsx'
import { Separator } from '~/components/shadcn/ui/separator.tsx'
import { ProfileConnectionType } from '~/domain/index.ts'
import { HeaderActionsProvider, useHeaderActions } from '~/hooks/use-header-actions.tsx'
import { orm, ProfileSessionConnection, withRequestContext } from '~/lib/mikro-orm/index.ts'
import { createSessionStorage } from '~/lib/session/index.ts'

function LayoutContent(): React.ReactNode {
	const { actions } = useHeaderActions()

	return (
		<SidebarProvider className='//flex h-full flex-1 //flex-col overflow-hidden'>
			<AppSidebar />
			<SidebarInset className='flex flex-1 flex-col overflow-hidden'>
				<header className='flex h-16 shrink-0 items-center gap-2 border-b'>
					<div className='flex items-center gap-2 px-4'>
						<SidebarTrigger className='-ml-1' />
						<Separator
							orientation='vertical'
							className='mr-2 h-4 bg-slate-300'
						/>
					</div>
					<div className='ml-auto flex items-center gap-2 px-4'>{actions}</div>
				</header>
				<div className='flex flex-1 flex-col overflow-hidden'>
					<Outlet />
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}

export default function CommonLayout({ loaderData }: Route.ComponentProps): React.ReactNode {
	return (
		<HeaderActionsProvider>
			<LayoutContent />
		</HeaderActionsProvider>
	)
}

export let loader = withRequestContext(async function loader({ request }: Route.LoaderArgs) {
	function redirectToSignIn(): never {
		const url = new URL(request.url)

		const target =
			url.pathname === '/'
				? '/auth/sign-in'
				: `/auth/sign-in?redirected-from=${encodeURIComponent(url.pathname + url.search)}`

		throw redirect(target)
	}

	const sessionStorage = createSessionStorage()
	const cookieSession = await sessionStorage.getSession(request.headers.get('Cookie'))

	// Check if session exists
	if (!cookieSession || !cookieSession.id) {
		// redirectToSignIn()
	}

	// Check if session has worklog target profile connection
	const worklogTargetConnection = await orm.em.findOne(ProfileSessionConnection, {
		session: { id: cookieSession.id },
		connectionType: ProfileConnectionType.WorklogTarget
	})

	if (!worklogTargetConnection) {
		// redirectToSignIn()
	}

	return {
		session: cookieSession
	}
})
