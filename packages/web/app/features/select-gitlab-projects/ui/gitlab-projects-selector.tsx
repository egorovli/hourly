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
import { Check } from 'lucide-react'
import { SiGitlab, SiGitlabHex } from '@icons-pack/react-simple-icons'
import { cn } from '~/lib/util/index.ts'
import type { GitlabProjectsSelectorProps } from '../model/types.ts'

export function GitlabProjectsSelector({
	data,
	value,
	onChange
}: GitlabProjectsSelectorProps): React.ReactNode {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					role='combobox'
				>
					<SiGitlab color={SiGitlabHex} />
					GitLab projects
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
										const project = data.projects.find(p => String(p.id) === id)
										return (
											<Badge
												key={id}
												variant='secondary'
												className='rounded-sm px-1 font-normal'
											>
												{project?.name_with_namespace ?? project?.path_with_namespace ?? 'Project'}
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
						placeholder='Search GitLab projects...'
						className='h-9'
					/>
					<CommandList>
						<CommandEmpty>No GitLab projects found.</CommandEmpty>
						<CommandGroup>
							{data.projects.map(project => (
								<CommandItem
									key={project.id}
									value={String(project.id)}
									onSelect={id => {
										const next = value.includes(id)
											? value.filter(item => item !== id)
											: [...value, id]
										onChange(next)
									}}
								>
									<div className='flex flex-col text-left'>
										<span className='text-sm font-medium'>{project.name}</span>
										<span className='text-xs text-muted-foreground'>
											{project.path_with_namespace}
										</span>
									</div>
									<Check
										className={cn('ml-auto h-4 w-4', {
											'opacity-0': !value.includes(String(project.id)),
											'opacity-100': value.includes(String(project.id))
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
