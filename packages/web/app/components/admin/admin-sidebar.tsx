import type { LucideIcon } from 'lucide-react'

import { FileTextIcon, ShieldIcon } from 'lucide-react'
import { Link, NavLink, useMatch, useResolvedPath } from 'react-router'

import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem
} from '~/components/shadcn/ui/sidebar.tsx'

export interface AdminNavItem {
	to: string
	label: string
	icon: LucideIcon
	description?: string
	end?: boolean
}

export const adminNavItems: AdminNavItem[] = [
	{
		to: '/admin/audit-logs',
		label: 'Audit Logs',
		icon: FileTextIcon,
		description: 'View system activity logs'
	}
]

export interface AdminSidebarProps extends React.ComponentProps<typeof Sidebar> {}

export function AdminSidebar(props: AdminSidebarProps): React.ReactNode {
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
							<Link to='/admin'>
								<div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg'>
									<ShieldIcon className='size-4' />
								</div>
								<div className='grid flex-1 text-left text-sm leading-tight'>
									<span className='truncate font-medium'>Admin</span>
									<span className='truncate text-xs'>System Management</span>
								</div>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarMenu>
					{adminNavItems.map(item => (
						<AdminSidebarNavLink
							key={item.to}
							{...item}
						/>
					))}
				</SidebarMenu>
			</SidebarContent>
		</Sidebar>
	)
}

function AdminSidebarNavLink({ icon: Icon, label, to, end }: AdminNavItem): React.ReactNode {
	const resolvedPath = useResolvedPath(to)
	const match = useMatch({ path: resolvedPath.pathname, end: end ?? false })

	return (
		<SidebarMenuItem>
			<SidebarMenuButton
				asChild
				isActive={match !== null}
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
