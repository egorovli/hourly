import { useMemo } from 'react'
import { SiAtlassian, SiAtlassianHex } from '@icons-pack/react-simple-icons'
import { Badge } from '~/components/shadcn/ui/badge.tsx'
import { Button } from '~/components/shadcn/ui/button.tsx'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/shadcn/ui/popover.tsx'
import { Separator } from '~/components/shadcn/ui/separator.tsx'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from '~/components/shadcn/ui/command.tsx'
import { Check } from 'lucide-react'
import { cn } from '~/lib/util/index.ts'
import type { JiraProjectsSelectorProps } from '../model/types.ts'

export function JiraProjectsSelector({
	data,
	value,
	onChange
}: JiraProjectsSelectorProps): React.ReactNode {
	const projects = useMemo(() => {
		const projects = data.resources.flatMap(resource => data.byResource[resource.id] ?? [])
		return Object.fromEntries(projects.map(project => [project.id, project]))
	}, [data])

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					role='combobox'
				>
					<SiAtlassian
						aria-hidden
						color={SiAtlassianHex}
					/>
					Jira projects
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
												{projects[id]?.name ?? 'Unknown project'}
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
						placeholder='Search projects...'
						className='h-9'
					/>
					<CommandList>
						<CommandEmpty>No projects found.</CommandEmpty>

						{data.resources.map(resource => {
							const resourceProjects = data.byResource[resource.id] ?? []
							if (resourceProjects.length === 0) {
								return null
							}

							return (
								<CommandGroup
									key={resource.id}
									heading={
										<div className='flex items-center gap-2'>
											{resource.avatarUrl ? (
												<img
													src={resource.avatarUrl}
													alt={`${resource.name} avatar`}
													className='h-4 w-4 rounded-sm'
												/>
											) : null}
											<span>{resource.name}</span>
										</div>
									}
								>
									{resourceProjects.map(project => (
										<CommandItem
											key={project.id}
											value={project.id}
											onSelect={id => {
												const next = value.includes(id)
													? value.filter(v => v !== id)
													: [...value, id]
												onChange(next)
											}}
										>
											{project.avatarUrls?.['48x48'] ? (
												<img
													src={project.avatarUrls['48x48']}
													alt={`${project.name} avatar`}
													className='h-6 w-6 rounded-sm'
												/>
											) : null}

											<div className='flex flex-col text-left'>
												<span className='text-sm font-medium'>{project.name}</span>
												<span className='text-xs text-muted-foreground'>{project.key}</span>
											</div>
											<Check
												className={cn('ml-auto h-4 w-4', {
													'opacity-0': !value.includes(project.id),
													'opacity-100': value.includes(project.id)
												})}
											/>
										</CommandItem>
									))}
								</CommandGroup>
							)
						})}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
