import type { JiraUsersSelectorProps } from '../model/types.ts'

import { useMemo } from 'react'
import { Check, UsersIcon } from 'lucide-react'

import { Badge } from '~/components/shadcn/ui/badge.tsx'
import { Button } from '~/components/shadcn/ui/button.tsx'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/shadcn/ui/popover.tsx'
import { Separator } from '~/components/shadcn/ui/separator.tsx'
import { cn } from '~/lib/util/index.ts'

import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from '~/components/shadcn/ui/command.tsx'

export function JiraUsersSelector({
	data,
	value,
	onChange
}: JiraUsersSelectorProps): React.ReactNode {
	const users = useMemo(() => {
		const users = data.users.filter(user => user.active ?? false)
		return Object.fromEntries(users.map(user => [user.accountId, user]))
	}, [data])

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					role='combobox'
				>
					<UsersIcon />
					Users
					{value?.length > 0 && (
						<>
							<Separator
								orientation='vertical'
								className='mx-1 h-4'
							/>
							<Badge
								variant='secondary'
								className='rounded-sm px-1 font-normal lg:hidden'
							>
								{value.length}
							</Badge>
							<div className='hidden space-x-1 lg:flex'>
								{value.length > 2 ? (
									<Badge
										variant='secondary'
										className='rounded-sm px-1 font-normal'
									>
										{value.length} selected
									</Badge>
								) : (
									value.map(id => {
										return (
											<Badge
												variant='secondary'
												key={id}
												className='rounded-sm px-1 font-normal'
											>
												{users[id]?.displayName ?? 'Unknown user'}
											</Badge>
										)
									})
								)}
							</div>
						</>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className='p-0'
				align='start'
			>
				<Command>
					<CommandInput
						placeholder='Search users...'
						className='h-9'
					/>
					<CommandList>
						<CommandEmpty>No users found.</CommandEmpty>

						<CommandGroup>
							{data.users.map(user => (
								<CommandItem
									key={user.accountId}
									value={user.accountId}
									onSelect={id => {
										const next = value.includes(id) ? value.filter(v => v !== id) : [...value, id]
										onChange(next)
									}}
								>
									{user.avatarUrls?.['48x48'] ? (
										<img
											src={user.avatarUrls['48x48']}
											alt={`${user.displayName} avatar`}
											className='h-6 w-6 rounded-sm'
										/>
									) : null}

									<span className='flex flex-col text-left'>
										<span className='text-sm font-medium'>{user.displayName}</span>
										{typeof user.emailAddress === 'string' && (
											<span className='text-xs text-muted-foreground'>{user.emailAddress}</span>
										)}
									</span>
									<Check
										className={cn('ml-auto h-4 w-4', {
											'opacity-0': !value.includes(user.accountId),
											'opacity-100': value.includes(user.accountId)
										})}
									/>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
