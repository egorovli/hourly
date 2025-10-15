import type { SessionUser } from '~/lib/session/storage.ts'

import { ChevronsUpDown, LogOut, Sparkles, CheckCircle2 } from 'lucide-react'
import { SiAtlassian, SiAtlassianHex, SiGitlab, SiGitlabHex } from '@icons-pack/react-simple-icons'
import { Link } from 'react-router'
import { DateTime } from 'luxon'
import { Fragment, useEffect, useMemo, useReducer } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '~/components/shadcn/ui/avatar.tsx'
import { Badge } from '~/components/shadcn/ui/badge.tsx'

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
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar
} from '~/components/shadcn/ui/sidebar.tsx'

export interface NavUserProps {
	user: NavUser
	sessionUser?: SessionUser
}

export interface NavUser {
	name: string
	email: string
	avatar: string
}

function formatExpiryRelative(expiresAt?: string): string {
	if (!expiresAt) {
		return '—'
	}

	const dt = DateTime.fromISO(expiresAt, { zone: 'utc' })
	if (!dt.isValid) {
		return '—'
	}

	const now = DateTime.utc()
	return dt.toRelative({ base: now, rounding: 'round' }) ?? '—'
}

function formatExpiryAbsoluteTitle(expiresAt?: string): string | undefined {
	if (!expiresAt) {
		return undefined
	}

	const dt = DateTime.fromISO(expiresAt)
	if (!dt.isValid) {
		return undefined
	}

	return dt.toLocaleString(DateTime.DATETIME_FULL)
}

interface ExpirationProps {
	date?: string
	interval?: number
}

function Expiration({ date, interval = 1000 }: ExpirationProps): React.ReactNode {
	const [, forceUpdate] = useReducer(x => -1 * x, 1)

	useEffect(() => {
		const id = setInterval(() => {
			forceUpdate()
		}, interval)

		return () => clearInterval(id)
	}, [interval])

	return <span title={formatExpiryAbsoluteTitle(date)}>{formatExpiryRelative(date)}</span>
}

export function NavUser({ user, sessionUser }: NavUserProps) {
	const { isMobile } = useSidebar()

	const providers = useMemo(
		() => [
			{
				key: 'atlassian' as const,
				label: 'Atlassian',
				email: sessionUser?.atlassian?.email,
				expiresAt: sessionUser?.atlassian?.tokenExpiresAt,
				signInPath: '/auth/atlassian/sign-in',
				signOutPath: '/auth/atlassian/sign-out',
				Icon: SiAtlassian,
				iconColor: SiAtlassianHex
			},
			{
				key: 'gitlab' as const,
				label: 'GitLab',
				email: sessionUser?.gitlab?.email,
				expiresAt: sessionUser?.gitlab?.tokenExpiresAt,
				signInPath: '/auth/gitlab/sign-in',
				signOutPath: '/auth/gitlab/sign-out',
				Icon: SiGitlab,
				iconColor: SiGitlabHex
			}
		],

		[sessionUser]
	)

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
								<AvatarFallback className='rounded-lg'>CN</AvatarFallback>
							</Avatar>
							<div className='grid flex-1 text-left text-sm leading-tight'>
								<span className='truncate font-medium'>{user.name}</span>
								<span className='truncate text-xs'>{user.email}</span>
							</div>
							<ChevronsUpDown className='ml-auto size-4' />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className='w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg'
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
									<AvatarFallback className='rounded-lg'>CN</AvatarFallback>
								</Avatar>
								<div className='grid flex-1 text-left text-sm leading-tight'>
									<span className='truncate font-medium'>{user.name}</span>
									<span className='truncate text-xs'>{user.email}</span>
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem className='justify-between'>
								<span className='flex items-center gap-2'>
									<Sparkles />
									Session
								</span>
								<Badge variant='secondary'>Control</Badge>
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						{providers.map((p, idx) => (
							<Fragment key={p.key}>
								{idx > 0 && <DropdownMenuSeparator />}
								<DropdownMenuGroup key={p.key}>
									<DropdownMenuLabel>
										<span className='inline-flex items-center gap-2'>
											<p.Icon
												color={p.iconColor}
												className='size-4'
											/>
											{p.label}
										</span>
									</DropdownMenuLabel>
									<div className='px-2 py-1.5 text-xs text-muted-foreground'>
										<div className='flex items-center justify-between'>
											<span className='truncate'>{p.email ?? 'Not connected'}</span>
											{p.email ? <CheckCircle2 className='text-green-600 size-3' /> : null}
										</div>
										<div
											className='mt-1'
											title={formatExpiryAbsoluteTitle(p.expiresAt)}
										>
											Expires: <Expiration date={p.expiresAt} />
										</div>
									</div>
									<DropdownMenuItem asChild>
										<Link to={p.signInPath}>Reauthenticate {p.label}</Link>
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<Link to={p.signOutPath}>Sign out {p.label}</Link>
									</DropdownMenuItem>
								</DropdownMenuGroup>
							</Fragment>
						))}
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild>
							<Link
								to='/auth/sign-out'
								className='flex items-center gap-2'
							>
								<LogOut />
								Sign out of all
							</Link>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
