import { Badge } from '~/shared/ui/shadcn/ui/badge.tsx'
import { Button } from '~/shared/ui/shadcn/ui/button.tsx'
import { Popover, PopoverContent, PopoverTrigger } from '~/shared/ui/shadcn/ui/popover.tsx'
import { Separator } from '~/shared/ui/shadcn/ui/separator.tsx'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from '~/shared/ui/shadcn/ui/command.tsx'
import { Check, UsersIcon } from 'lucide-react'
import { cn } from '~/lib/util/index.ts'
import type { GitlabContributorsSelectorProps } from '../model/types.ts'

export function GitlabContributorsSelector({
	data,
	value,
	onChange
}: GitlabContributorsSelectorProps): React.ReactNode {
	const contributors = data.contributors
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					role='combobox'
				>
					<UsersIcon />
					GitLab contributors
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
										const contributor = contributors.find(item => item.id === id)
										return (
											<Badge
												key={id}
												variant='secondary'
												className='rounded-sm px-1 font-normal'
											>
												{contributor?.name ?? contributor?.email ?? 'Contributor'}
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
						placeholder='Search contributors...'
						className='h-9'
					/>
					<CommandList>
						<CommandEmpty>No contributors found.</CommandEmpty>
						<CommandGroup>
							{contributors.map(contributor => (
								<CommandItem
									key={contributor.id}
									value={contributor.id}
									onSelect={id => {
										const next = value.includes(id)
											? value.filter(item => item !== id)
											: [...value, id]
										onChange(next)
									}}
								>
									<div className='flex flex-col text-left'>
										<span className='text-sm font-medium'>
											{contributor.name ?? contributor.email ?? 'Unknown contributor'}
										</span>
										<span className='text-xs text-muted-foreground'>
											{contributor.email ?? 'No email available'}
										</span>
									</div>
									<div
										className='ml-auto text-xs text-muted-foreground line-clamp-1 shrink-0 font-mono'
										title={`${contributor.commitCount} commits`}
									>
										{contributor.commitCount}
									</div>
									<Check
										className={cn('ml-2 h-4 w-4', {
											'opacity-0': !value.includes(contributor.id),
											'opacity-100': value.includes(contributor.id)
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
