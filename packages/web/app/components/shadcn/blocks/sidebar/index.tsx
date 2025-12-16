import type { LucideIcon } from 'lucide-react'
import type { SessionUser } from '~/lib/session/storage.ts'

import {
	BadgeCheck,
	BarChart3,
	Bell,
	CalendarIcon,
	ChevronsUpDown,
	Clock,
	CreditCard,
	FolderKanban,
	LogOut,
	Sparkles,
	TimerIcon
} from 'lucide-react'
import { Form, Link, NavLink, useMatch, useResolvedPath } from 'react-router'

import { Avatar, AvatarFallback, AvatarImage } from '~/components/shadcn/ui/avatar.tsx'

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '~/components/shadcn/ui/dropdown-menu.tsx'

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar
} from '~/components/shadcn/ui/sidebar.tsx'

type SidebarNavItem = {
	to: string
	label: string
	icon: LucideIcon
	end?: boolean
}

const primaryNavItems: SidebarNavItem[] = [
	{
		to: '/',
		label: 'Calendar',
		icon: CalendarIcon,
		end: true
	},
	{
		to: '/analytics',
		label: 'Analytics',
		icon: BarChart3
	},
	{
		to: '/worklogs',
		label: 'Worklogs',
		icon: Clock
	},
	{
		to: '/projects',
		label: 'Projects',
		icon: FolderKanban
	}
]

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
	sessionUser?: SessionUser
}

export function AppSidebar({ sessionUser, ...props }: AppSidebarProps) {
	const primary = sessionUser?.atlassian ?? sessionUser?.gitlab
	const user = {
		name: primary?.displayName ?? 'Guest',
		email: primary?.email ?? 'Not connected',
		avatar: primary?.avatarUrl ?? ''
	}

	return (
		<Sidebar
			variant='inset'
			{...props}
		>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							size='lg'
							asChild
						>
							<Link to='#'>
								<div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg'>
									<TimerIcon className='size-4' />
								</div>
								<div className='grid flex-1 text-left text-sm leading-tight'>
									<span className='truncate font-medium'>Hourly</span>
									<span className='truncate text-xs'>Jira Worklogs</span>
								</div>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarMenu>
					{primaryNavItems.map(item => (
						<SidebarNavLink
							key={item.to}
							{...item}
						/>
					))}
				</SidebarMenu>
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={user} />
			</SidebarFooter>
		</Sidebar>
	)
}

function SidebarNavLink({ icon: Icon, label, to, end }: SidebarNavItem) {
	const resolvedPath = useResolvedPath(to)
	const match = useMatch({ path: resolvedPath.pathname, end: end ?? false })

	return (
		<SidebarMenuItem>
			<SidebarMenuButton
				asChild
				isActive={Boolean(match)}
			>
				<NavLink
					to={to}
					end={end ?? false}
				>
					<Icon />
					<span>{label}</span>
				</NavLink>
			</SidebarMenuButton>
		</SidebarMenuItem>
	)
}

function NavUser({ user }: { user: { name: string; email: string; avatar: string } }) {
	const { isMobile } = useSidebar()
	const initials = user.name
		.split(' ')
		.map(n => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size='lg'
							className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
						>
							<Avatar className='h-8 w-8 rounded-lg'>
								<AvatarImage
									src={user.avatar}
									alt={user.name}
								/>
								<AvatarFallback className='rounded-lg bg-light-sky-blue-700 text-light-sky-blue-100'>
									{initials}
								</AvatarFallback>
							</Avatar>
							<div className='grid flex-1 text-left text-sm leading-tight'>
								<span className='truncate font-medium'>{user.name}</span>
								<span className='truncate text-xs'>{user.email}</span>
							</div>
							<ChevronsUpDown className='ml-auto size-4' />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
						side={isMobile ? 'bottom' : 'right'}
						align='end'
						sideOffset={4}
					>
						<DropdownMenuLabel className='p-0 font-normal'>
							<div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
								<Avatar className='h-8 w-8 rounded-lg'>
									<AvatarImage
										src={user.avatar}
										alt={user.name}
									/>
									<AvatarFallback className='rounded-lg bg-light-sky-blue-700 text-light-sky-blue-100'>
										{initials}
									</AvatarFallback>
								</Avatar>
								<div className='grid flex-1 text-left text-sm leading-tight'>
									<span className='truncate font-medium'>{user.name}</span>
									<span className='truncate text-xs'>{user.email}</span>
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem>
								<Sparkles />
								Upgrade to Pro
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem>
								<BadgeCheck />
								Account
							</DropdownMenuItem>
							<DropdownMenuItem>
								<CreditCard />
								Billing
							</DropdownMenuItem>
							<DropdownMenuItem>
								<Bell />
								Notifications
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<Form
							method='post'
							action='/auth/sign-out'
						>
							<DropdownMenuItem asChild>
								<button
									type='submit'
									className='w-full'
								>
									<LogOut />
									Log out
								</button>
							</DropdownMenuItem>
						</Form>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
