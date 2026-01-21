import type { Route } from './+types/__.ts'
import type { User } from '~/lib/atlassian/user.ts'

import { Form, Outlet } from 'react-router'
import { LogOutIcon, UserIcon } from 'lucide-react'

import { Logo } from '~/components/logo.tsx'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/shadcn/ui/avatar.tsx'

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '~/components/shadcn/ui/dropdown-menu.tsx'

import { requireAuthOrRedirect } from '~/lib/auth/index.ts'
import { cached } from '~/lib/cached/index.ts'
import { withRequestContext } from '~/lib/mikro-orm/index.ts'

function getInitials(name: string): string {
	return name
		.split(' ')
		.map(n => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
}

interface HeaderProps {
	user: User
}

function Header({ user }: HeaderProps): React.ReactNode {
	return (
		<header className='border-b bg-background'>
			<div className='flex h-14 items-center justify-between px-6'>
				<Logo />

				<DropdownMenu>
					<DropdownMenuTrigger className='flex items-center gap-2 rounded-md px-2 py-1.5 outline-none hover:bg-accent'>
						<Avatar className='size-8'>
							{user.picture && (
								<AvatarImage
									src={user.picture}
									alt={user.name ?? 'User'}
								/>
							)}
							<AvatarFallback className='text-xs'>
								{user.name ? getInitials(user.name) : <UserIcon className='size-4' />}
							</AvatarFallback>
						</Avatar>
						{user.name && <span className='text-sm'>{user.name}</span>}
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align='end'
						className='w-48'
					>
						<Form
							method='post'
							action='/auth/sign-out'
						>
							<DropdownMenuItem asChild>
								<button
									type='submit'
									className='w-full cursor-pointer'
								>
									<LogOutIcon className='mr-2 size-4' />
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
			<Header user={loaderData.user} />

			<main className='flex-1'>
				<Outlet />
			</main>
		</div>
	)
}

export const loader = withRequestContext(async function loader({ request }: Route.LoaderArgs) {
	const auth = await requireAuthOrRedirect(request)

	const cacheOpts = { keyPrefix: `profile:${auth.profile.id}` }
	const getMe = cached(auth.client.getMe.bind(auth.client), cacheOpts)
	const getAccessibleResources = cached(
		auth.client.getAccessibleResources.bind(auth.client),
		cacheOpts
	)
	const getProjects = cached(auth.client.getProjects.bind(auth.client), cacheOpts)

	const user = await getMe()
	const accessibleResources = await getAccessibleResources()

	const projects = await Promise.all(
		accessibleResources.map(async resource => getProjects(resource.id))
	)

	return {
		user,
		accessibleResources,
		projects
	}
})
