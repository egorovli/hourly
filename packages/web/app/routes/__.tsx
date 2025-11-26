import type React from 'react'
import type { Route } from './+types/__.ts'

import { Outlet, redirect } from 'react-router'

import { AppSidebar } from '~/components/shadcn/blocks/sidebar/index.tsx'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '~/components/shadcn/ui/sidebar.tsx'
import { Separator } from '~/components/shadcn/ui/separator.tsx'
import { ProfileConnectionType } from '~/domain/index.ts'
import { HeaderActionsProvider, useHeaderActions } from '~/hooks/use-header-actions.tsx'
import { AtlassianClient } from '~/lib/atlassian/index.ts'
import { Provider } from '~/lib/auth/strategies/common.ts'
import { orm, ProfileSessionConnection, Token, withRequestContext } from '~/lib/mikro-orm/index.ts'
import { createSessionStorage } from '~/lib/session/index.ts'
import type { SessionUser } from '~/lib/session/storage.ts'

function LayoutContent({ sessionUser }: { sessionUser?: SessionUser }): React.ReactNode {
	const { actions } = useHeaderActions()

	return (
		<SidebarProvider className='//flex h-full flex-1 //flex-col overflow-hidden'>
			<AppSidebar sessionUser={sessionUser} />
			<SidebarInset className='flex flex-1 flex-col overflow-hidden'>
				<header className='flex h-16 shrink-0 items-center gap-2 border-b border-slate-200'>
					<div className='flex items-center gap-2 px-4'>
						<SidebarTrigger className='-ml-1' />
						<Separator
							orientation='vertical'
							className='mr-2 h-4 bg-slate-200'
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
			<LayoutContent sessionUser={loaderData.sessionUser} />
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
		redirectToSignIn()
	}

	// Check if session has worklog target profile connection
	const worklogTargetConnection = await orm.em.findOne(ProfileSessionConnection, {
		session: { id: cookieSession.id },
		connectionType: ProfileConnectionType.WorklogTarget
	})

	if (!worklogTargetConnection) {
		redirectToSignIn()
	}

	// Fetch user session data for sidebar
	const sessionUser: SessionUser = {}
	const connections = await orm.em.find(
		ProfileSessionConnection,
		{
			session: { id: cookieSession.id }
		},
		{
			populate: ['profile']
		}
	)

	for (const connection of connections) {
		const profile = connection.profile
		const token = await orm.em.findOne(Token, {
			profileId: profile.id,
			provider: profile.provider
		})

		const profileData = profile.data as {
			displayName?: string
			email?: string
			avatarUrl?: string
		}

		if (profile.provider === Provider.Atlassian) {
			sessionUser.atlassian = {
				displayName: profileData.displayName ?? 'Unknown',
				email: profileData.email ?? '',
				avatarUrl: profileData.avatarUrl ?? '',
				tokenExpiresAt: token?.expiresAt?.toISOString(),
				hasRefreshToken: typeof token?.refreshToken === 'string' && token.refreshToken.length > 0
			}
		} else if (profile.provider === Provider.GitLab) {
			sessionUser.gitlab = {
				displayName: profileData.displayName ?? 'Unknown',
				email: profileData.email ?? '',
				avatarUrl: profileData.avatarUrl ?? '',
				tokenExpiresAt: token?.expiresAt?.toISOString(),
				hasRefreshToken: typeof token?.refreshToken === 'string' && token.refreshToken.length > 0
			}
		}
	}

	// Fetch accessible resources from Atlassian if available
	let accessibleResources: Awaited<ReturnType<AtlassianClient['getAccessibleResources']>> = []
	const projectsByResource: Array<{
		resourceId: string
		resourceName: string
		resourceAvatarUrl?: string
		projects: Awaited<ReturnType<AtlassianClient['getProjects']>>
	}> = []

	const atlassianConnection = await orm.em.findOne(
		ProfileSessionConnection,
		{
			session: { id: cookieSession.id },
			profile: { provider: Provider.Atlassian }
		},
		{
			populate: ['profile']
		}
	)

	if (atlassianConnection) {
		const token = await orm.em.findOne(Token, {
			profileId: atlassianConnection.profile.id,
			provider: Provider.Atlassian
		})

		if (token) {
			const client = new AtlassianClient({
				accessToken: token.accessToken,
				refreshToken: token.refreshToken
			})

			try {
				accessibleResources = await client.getAccessibleResources({
					signal: request.signal
				})

				// Fetch projects for each resource
				const projectPromises = accessibleResources.map(async resource => {
					let errorDetails: { message?: string; status?: number; url?: string } | undefined
					try {
						// biome-ignore lint/suspicious/noConsole: Debug logging
						console.log(
							`Starting to fetch projects for resource: ${resource.name} (${resource.id})`
						)
						const projects = await client.getProjects(resource.id, resource.url, {
							signal: request.signal
						})
						// biome-ignore lint/suspicious/noConsole: Debug logging
						console.log(
							`Successfully fetched ${projects.length} projects for resource ${resource.name}`
						)
						return {
							resourceId: resource.id,
							resourceName: resource.name,
							resourceAvatarUrl: resource.avatarUrl,
							projects,
							error: undefined
						}
					} catch (error) {
						// Log error but don't fail - some resources may not have Jira
						const errorMessage = error instanceof Error ? error.message : String(error)
						// biome-ignore lint/suspicious/noConsole: Server-side error logging is acceptable
						console.error(
							`Failed to fetch projects for resource ${resource.id} (${resource.name}):`,
							{
								error: errorMessage,
								stack: error instanceof Error ? error.stack : undefined,
								resourceUrl: resource.url
							}
						)

						// Extract status code from error message if available
						const statusMatch = errorMessage.match(/status (\d+)/)
						errorDetails = {
							message: errorMessage,
							status: statusMatch?.[1] ? Number.parseInt(statusMatch[1], 10) : undefined,
							url: resource.url
						}

						return {
							resourceId: resource.id,
							resourceName: resource.name,
							resourceAvatarUrl: resource.avatarUrl,
							projects: [],
							error: errorDetails
						}
					}
				})

				projectsByResource.push(...(await Promise.all(projectPromises)))
			} catch (error) {
				// Log error but don't fail the loader - resources are optional
				// biome-ignore lint/suspicious/noConsole: Server-side error logging is acceptable
				console.error('Failed to fetch accessible resources:', error)
			}
		}
	}

	return {
		session: cookieSession,
		sessionUser,
		accessibleResources,
		projectsByResource
	}
})
