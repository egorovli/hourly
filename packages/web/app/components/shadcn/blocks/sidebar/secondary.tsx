import type { LucideIcon } from 'lucide-react'

import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem
} from '~/components/shadcn/ui/sidebar.tsx'

export interface NavSecondaryProps extends React.ComponentPropsWithoutRef<typeof SidebarGroup> {
	items: NavSecondaryItem[]
}

export interface NavSecondaryItem {
	title: string
	url: string
	icon: LucideIcon
}

export function NavSecondary({ items, ...props }: NavSecondaryProps) {
	return (
		<SidebarGroup {...props}>
			<SidebarGroupContent>
				<SidebarMenu>
					{items.map(item => (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton
								asChild
								size='sm'
							>
								<a href={item.url}>
									<item.icon />
									<span>{item.title}</span>
								</a>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	)
}
