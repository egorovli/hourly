import type { LucideIcon } from 'lucide-react'
import type { SessionUser } from '~/lib/session/storage.ts'

import { BarChart3, CalendarIcon, Clock, FolderKanban, TimerIcon } from 'lucide-react'
import { Link, NavLink, useMatch, useResolvedPath } from 'react-router'

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem
} from '~/components/shadcn/ui/sidebar.tsx'

import { NavUser } from './user.tsx'

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
				<NavUser
					sessionUser={sessionUser}
					user={user}
				/>
			</SidebarFooter>
		</Sidebar>
	)
}

function SidebarNavLink({ icon: Icon, label, to, end }: SidebarNavItem) {
	const resolvedPath = useResolvedPath(to)
	const shouldMatchExact = end ?? false
	const match = useMatch({ path: resolvedPath.pathname, end: shouldMatchExact })
	const isActive = Boolean(match)

	return (
		<SidebarMenuItem>
			<SidebarMenuButton
				asChild
				isActive={isActive}
			>
				<NavLink
					to={to}
					end={shouldMatchExact}
				>
					<Icon />
					<span>{label}</span>
				</NavLink>
			</SidebarMenuButton>
		</SidebarMenuItem>
	)
}
