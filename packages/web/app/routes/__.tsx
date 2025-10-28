import type { Route } from './+types/__.ts'
import type React from 'react'

import { Link, Outlet, redirect } from 'react-router'

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator
} from '~/shared/ui/shadcn/ui/breadcrumb.tsx'

import { AppSidebar } from '~/shared/ui/shadcn/blocks/sidebar/index.tsx'
import { Separator } from '~/shared/ui/shadcn/ui/separator.tsx'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '~/shared/ui/shadcn/ui/sidebar.tsx'
import { Toaster } from '~/shared/ui/shadcn/ui/sonner.tsx'

import { getSession } from '~/lib/session/storage.ts'
import { enrichSessionUserWithRefreshTokens } from '~/lib/session/helpers.ts'

export default function CommonLayout({ loaderData }: Route.ComponentProps): React.ReactNode {
	return (
		<SidebarProvider>
			<AppSidebar sessionUser={loaderData.user} />
			<SidebarInset>
				<header className='flex h-16 shrink-0 items-center gap-2'>
					<div className='flex items-center gap-2 px-4'>
						<SidebarTrigger className='-ml-1' />
						<Separator
							orientation='vertical'
							className='mr-2 data-[orientation=vertical]:h-4'
						/>
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem className='hidden md:block'>
									<BreadcrumbLink asChild>
										<Link to='/'>Worklog</Link>
									</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator className='hidden md:block' />
								<BreadcrumbItem>
									<BreadcrumbPage>Calendar</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>
				</header>
				<div className='flex flex-1 flex-col gap-4 p-4 pt-0'>
					<main className='flex flex-1 flex-col'>
						<Outlet />
					</main>
				</div>
			</SidebarInset>
			<Toaster />
		</SidebarProvider>
	)
}

export async function loader({ request }: Route.LoaderArgs) {
	const session = await getSession(request.headers.get('Cookie'))
	const user = session.data.user

	// Require both Atlassian and GitLab authentication
	if (!user?.atlassian || !user?.gitlab) {
		const url = new URL(request.url)
		const redirectedFrom = [url.pathname, url.search, url.hash].join('')
		return redirect(`/auth/sign-in?redirected-from=${encodeURIComponent(redirectedFrom)}`)
	}

	// Enrich user with refresh token availability
	const enrichedUser = await enrichSessionUserWithRefreshTokens(user)

	return { user: enrichedUser }
}
