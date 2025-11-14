import type { SessionUser } from '~/lib/session/storage.ts'

import { Avatar, AvatarFallback, AvatarImage } from '~/components/shadcn/ui/avatar.tsx'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '~/components/shadcn/ui/sidebar.tsx'

export interface NavUserProps {
	user: NavUser
	sessionUser?: SessionUser
}

export interface NavUser {
	name: string
	email: string
	avatar: string
}

export function NavUser({ user }: NavUserProps) {
	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<SidebarMenuButton size='lg'>
					<Avatar className='h-8 w-8 rounded-lg'>
						<AvatarImage
							src={user.avatar}
							alt={user.name}
						/>
						<AvatarFallback className='rounded-lg'>
							{user.name
								.split(' ')
								.map(n => n[0])
								.join('')
								.toUpperCase()
								.slice(0, 2)}
						</AvatarFallback>
					</Avatar>
					<div className='grid flex-1 text-left text-sm leading-tight'>
						<span className='truncate font-medium'>{user.name}</span>
						<span className='truncate text-xs'>{user.email}</span>
					</div>
				</SidebarMenuButton>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
