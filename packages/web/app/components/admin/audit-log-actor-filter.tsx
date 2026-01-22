import type { ResolvedActor } from '~/domain/index.ts'

import { CheckIcon, PlusCircleIcon, UserIcon } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '~/components/shadcn/ui/avatar.tsx'
import { Badge } from '~/components/shadcn/ui/badge.tsx'
import { Button } from '~/components/shadcn/ui/button.tsx'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator
} from '~/components/shadcn/ui/command.tsx'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/shadcn/ui/popover.tsx'
import { Separator } from '~/components/shadcn/ui/separator.tsx'
import { cn } from '~/lib/util/index.ts'

/** Special value for anonymous actors */
export const ANONYMOUS_ACTOR_VALUE = 'anonymous'

export interface AuditLogActorFilterProps {
	actors: Record<string, ResolvedActor>
	selected: string[]
	onSelectionChange: (values: string[]) => void
	/** Whether to show anonymous option */
	showAnonymous?: boolean
}

function getInitials(name: string | undefined, email: string | undefined): string {
	const source = name ?? email ?? '?'
	const parts = source.split(/[\s@]+/).filter(p => p.length > 0)

	if (parts.length >= 2) {
		const first = parts[0]
		const second = parts[1]

		if (first && first.length > 0 && second && second.length > 0) {
			return (first.charAt(0) + second.charAt(0)).toUpperCase()
		}
	}

	return source.slice(0, 2).toUpperCase()
}

export function AuditLogActorFilter({
	actors,
	selected,
	onSelectionChange,
	showAnonymous = true
}: AuditLogActorFilterProps): React.ReactNode {
	const selectedSet = new Set(selected)

	function toggleOption(value: string): void {
		const newSelected = new Set(selectedSet)
		if (newSelected.has(value)) {
			newSelected.delete(value)
		} else {
			newSelected.add(value)
		}
		onSelectionChange(Array.from(newSelected))
	}

	function clearSelection(): void {
		onSelectionChange([])
	}

	// Build sorted actor list
	const actorList = Object.entries(actors)
		.map(([key, actor]) => ({
			key,
			actor,
			label: actor.displayName ?? actor.email ?? actor.profileId
		}))
		.sort((a, b) => a.label.localeCompare(b.label))

	// Get display text for selected actors
	function getSelectedLabel(): React.ReactNode {
		if (selected.length === 0) {
			return null
		}

		if (selected.length > 2) {
			return (
				<Badge
					variant='secondary'
					className='rounded-sm px-1 font-normal'
				>
					{selected.length} selected
				</Badge>
			)
		}

		return (
			<div className='flex gap-1'>
				{selected.map(key => {
					if (key === ANONYMOUS_ACTOR_VALUE) {
						return (
							<Badge
								key={key}
								variant='secondary'
								className='rounded-sm px-1 font-normal'
							>
								Anonymous
							</Badge>
						)
					}
					const actor = actors[key]
					const label = actor?.displayName ?? actor?.email ?? key.split(':')[1] ?? key
					return (
						<Badge
							key={key}
							variant='secondary'
							className='rounded-sm px-1 font-normal'
						>
							{label}
						</Badge>
					)
				})}
			</div>
		)
	}

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					size='sm'
					className='h-9 border-dashed'
				>
					<PlusCircleIcon className='mr-2 size-4' />
					Actor
					{selected.length > 0 && (
						<>
							<Separator
								orientation='vertical'
								className='mx-2 h-4'
							/>
							<span className='hidden lg:flex'>{getSelectedLabel()}</span>
							<Badge
								variant='secondary'
								className='rounded-sm px-1 font-normal lg:hidden'
							>
								{selected.length}
							</Badge>
						</>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className='w-[280px] p-0'
				align='start'
			>
				<Command>
					<CommandInput placeholder='Search actors...' />
					<CommandList>
						<CommandEmpty>No actors found.</CommandEmpty>
						<CommandGroup>
							{/* Anonymous option */}
							{showAnonymous && (
								<CommandItem
									onSelect={() => toggleOption(ANONYMOUS_ACTOR_VALUE)}
									className='gap-2'
								>
									<div
										className={cn(
											'flex size-4 items-center justify-center rounded-sm border border-primary',
											selectedSet.has(ANONYMOUS_ACTOR_VALUE)
												? 'bg-primary text-primary-foreground'
												: 'opacity-50 [&_svg]:invisible'
										)}
									>
										<CheckIcon className='size-3' />
									</div>
									<div className='flex size-6 items-center justify-center rounded-full bg-muted'>
										<UserIcon className='size-3.5 text-muted-foreground' />
									</div>
									<div className='flex flex-col'>
										<span className='text-sm font-medium'>Anonymous</span>
										<span className='text-xs text-muted-foreground'>System or unauthenticated</span>
									</div>
								</CommandItem>
							)}

							{/* Separator between anonymous and real actors */}
							{showAnonymous && actorList.length > 0 && <CommandSeparator className='my-1' />}

							{/* Actor list */}
							{actorList.map(({ key, actor, label }) => {
								const isSelected = selectedSet.has(key)
								const initials = getInitials(actor.displayName, actor.email)

								return (
									<CommandItem
										key={key}
										onSelect={() => toggleOption(key)}
										className='gap-2'
									>
										<div
											className={cn(
												'flex size-4 items-center justify-center rounded-sm border border-primary',
												isSelected
													? 'bg-primary text-primary-foreground'
													: 'opacity-50 [&_svg]:invisible'
											)}
										>
											<CheckIcon className='size-3' />
										</div>
										<Avatar className='size-6'>
											<AvatarImage
												src={actor.avatarUrl}
												alt={label}
											/>
											<AvatarFallback className='text-[10px]'>{initials}</AvatarFallback>
										</Avatar>
										<div className='flex min-w-0 flex-1 flex-col'>
											<span className='truncate text-sm font-medium'>{label}</span>
											{actor.email && actor.displayName && (
												<span className='truncate text-xs text-muted-foreground'>
													{actor.email}
												</span>
											)}
										</div>
										<Badge
											variant='outline'
											className='ml-auto shrink-0 text-[10px] px-1 py-0'
										>
											{actor.provider}
										</Badge>
									</CommandItem>
								)
							})}
						</CommandGroup>

						{selected.length > 0 && (
							<>
								<CommandSeparator />
								<CommandGroup>
									<CommandItem
										onSelect={clearSelection}
										className='justify-center text-center'
									>
										Clear filters
									</CommandItem>
								</CommandGroup>
							</>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
