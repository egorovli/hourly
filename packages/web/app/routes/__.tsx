import type { Route } from './+types/__.ts'

import { Form, Outlet, redirect } from 'react-router'
import { LogOut } from 'lucide-react'

import { Logo } from '~/components/logo.tsx'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/shadcn/ui/avatar.tsx'
import { createSessionStorage } from '~/lib/session/index.ts'
import { ProfileConnectionType } from '~/domain/index.ts'

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '~/components/shadcn/ui/dropdown-menu.tsx'

import {
	orm,
	ProfileSessionConnection,
	Session,
	withRequestContext
} from '~/lib/mikro-orm/index.ts'

interface ProfileData {
	displayName: string
	email?: string
	avatarUrl?: string
}

function getInitials(name: string): string {
	return name
		.split(' ')
		.map(n => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
}

function Header({ profile }: { profile: ProfileData }): React.ReactNode {
	const initials = getInitials(profile.displayName)

	return (
		<header className='border-b bg-background'>
			<div className='flex h-14 items-center justify-between px-6'>
				<Logo />

				<DropdownMenu>
					<DropdownMenuTrigger className='flex items-center gap-2 rounded-md px-2 py-1.5 outline-none hover:bg-accent'>
						<Avatar className='size-8'>
							<AvatarImage
								src={profile.avatarUrl}
								alt={profile.displayName}
							/>
							<AvatarFallback className='text-xs'>{initials}</AvatarFallback>
						</Avatar>
						<span className='text-sm'>{profile.displayName}</span>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align='end'
						className='w-56'
					>
						<DropdownMenuLabel className='font-normal'>
							<div className='flex flex-col space-y-1'>
								<p className='text-sm font-medium'>{profile.displayName}</p>
								{profile.email && <p className='text-xs text-muted-foreground'>{profile.email}</p>}
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<Form
							method='post'
							action='/auth/sign-out'
						>
							<DropdownMenuItem asChild>
								<button
									type='submit'
									className='w-full cursor-pointer'
								>
									<LogOut className='mr-2 size-4' />
									Sign out
								</button>
							</DropdownMenuItem>
						</Form>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</header>
	)
}

export default function AuthenticatedLayout({ loaderData }: Route.ComponentProps): React.ReactNode {
	return (
		<div className='flex h-full flex-col'>
			<Header profile={loaderData.profile} />

			<main className='flex-1'>
				<Outlet />
			</main>
		</div>
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

	const { em } = orm
	const sessionStorage = createSessionStorage()
	const cookieSession = await sessionStorage.getSession(request.headers.get('Cookie'))

	if (!cookieSession || !cookieSession.id) {
		redirectToSignIn()
	}

	const session = await em.findOne(Session, {
		id: cookieSession.id
	})

	if (!session) {
		redirectToSignIn()
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
		redirectToSignIn()
	}

	// TODO: Proper types.
	const profile = connection.profile
	const profileData = (profile.data ?? {}) as unknown as ProfileData

	return {
		profile: {
			id: profile.id,
			provider: profile.provider,
			displayName: profileData.displayName,
			email: profileData.email,
			avatarUrl: profileData.avatarUrl
		}
	}
})
