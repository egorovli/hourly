import type { SessionUser } from '~/lib/session/storage.ts'

import { BarChart3, CalendarIcon, Clock, FolderKanban, TimerIcon } from 'lucide-react'
import { Link } from 'react-router'

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
					<SidebarMenuItem>
						<SidebarMenuButton
							asChild
							isActive
						>
							<Link to='/'>
								<CalendarIcon />
								<span>Calendar</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<SidebarMenuButton asChild>
							<Link to='/analytics'>
								<BarChart3 />
								<span>Analytics</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<SidebarMenuButton asChild>
							<Link to='/worklogs'>
								<Clock />
								<span>Worklogs</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<SidebarMenuButton asChild>
							<Link to='/projects'>
								<FolderKanban />
								<span>Projects</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
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
