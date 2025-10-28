import type { LucideIcon } from 'lucide-react'

import { Folder, MoreHorizontal, Share, Trash2 } from 'lucide-react'

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '~/shared/ui/shadcn/ui/dropdown-menu.tsx'

import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar
} from '~/shared/ui/shadcn/ui/sidebar.tsx'

export interface NavProject {
	name: string
	url: string
	icon: LucideIcon
}

export interface NavProjectsProps {
	projects: NavProject[]
}

export function NavProjects({ projects }: NavProjectsProps) {
	const { isMobile } = useSidebar()

	return (
		<SidebarGroup className='group-data-[collapsible=icon]:hidden'>
			<SidebarGroupLabel>Projects</SidebarGroupLabel>
			<SidebarMenu>
				{projects.map(item => (
					<SidebarMenuItem key={item.name}>
						<SidebarMenuButton asChild>
							<a href={item.url}>
								<item.icon />
								<span>{item.name}</span>
							</a>
						</SidebarMenuButton>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuAction showOnHover>
									<MoreHorizontal />
									<span className='sr-only'>More</span>
								</SidebarMenuAction>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className='w-48'
								side={isMobile ? 'bottom' : 'right'}
								align={isMobile ? 'end' : 'start'}
							>
								<DropdownMenuItem>
									<Folder className='text-muted-foreground' />
									<span>View Project</span>
								</DropdownMenuItem>
								<DropdownMenuItem>
									<Share className='text-muted-foreground' />
									<span>Share Project</span>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem>
									<Trash2 className='text-muted-foreground' />
									<span>Delete Project</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				))}
				<SidebarMenuItem>
					<SidebarMenuButton>
						<MoreHorizontal />
						<span>More</span>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		</SidebarGroup>
	)
}
