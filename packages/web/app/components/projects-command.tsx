import { Check, ChevronsUpDown, FolderIcon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '~/components/shadcn/ui/button.tsx'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from '~/components/shadcn/ui/command.tsx'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/shadcn/ui/popover.tsx'
import { cn } from '~/lib/util/index.ts'

type Project = {
	id: string
	name: string
	key: string
}

type ProjectGroup = {
	id: string
	name: string
	projects: Project[]
}

// Mock data - replace with real data
const projectGroups: ProjectGroup[] = [
	{
		id: 'team-alpha',
		name: 'Team Alpha',
		projects: [
			{ id: 'proj-1', name: 'Website Redesign', key: 'WEB' },
			{ id: 'proj-2', name: 'Mobile App', key: 'MOB' },
			{ id: 'proj-3', name: 'API Platform', key: 'API' }
		]
	},
	{
		id: 'team-beta',
		name: 'Team Beta',
		projects: [
			{ id: 'proj-4', name: 'Customer Portal', key: 'CP' },
			{ id: 'proj-5', name: 'Admin Dashboard', key: 'AD' }
		]
	},
	{
		id: 'archived',
		name: 'Archived',
		projects: [
			{ id: 'proj-6', name: 'Legacy System', key: 'LEG' },
			{ id: 'proj-7', name: 'Old Platform', key: 'OLD' }
		]
	}
]

type ProjectsCommandProps = {
	value?: string
	onValueChange?: (value: string) => void
}

export function ProjectsCommand({ value, onValueChange }: ProjectsCommandProps) {
	const [open, setOpen] = useState(false)
	const [selectedValue, setSelectedValue] = useState(value || 'all')

	function handleSelect(currentValue: string): void {
		setSelectedValue(currentValue)
		onValueChange?.(currentValue)
		setOpen(false)
	}

	function getSelectedLabel(): string {
		if (selectedValue === 'all') {
			return 'All Projects'
		}

		for (const group of projectGroups) {
			const project = group.projects.find(p => p.id === selectedValue)
			if (project) {
				return project.name
			}
		}

		return 'Select project...'
	}

	return (
		<Popover
			open={open}
			onOpenChange={setOpen}
		>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					role='combobox'
					aria-expanded={open}
					className='h-10 w-full justify-between border-slate-300 bg-white font-normal hover:bg-slate-50'
				>
					<span className='truncate'>{getSelectedLabel()}</span>
					<ChevronsUpDown className='ml-2 size-4 shrink-0 opacity-50' />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className='w-[300px] p-0'
				align='start'
			>
				<Command>
					<CommandInput placeholder='Search projects...' />
					<CommandList>
						<CommandEmpty>No project found.</CommandEmpty>

						<CommandGroup>
							<CommandItem
								value='all'
								onSelect={() => handleSelect('all')}
							>
								<Check
									className={cn('size-4', selectedValue === 'all' ? 'opacity-100' : 'opacity-0')}
								/>
								All Projects
							</CommandItem>
						</CommandGroup>

						{projectGroups.map(group => (
							<CommandGroup
								key={group.id}
								heading={
									<div className='flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-slate-700'>
										<FolderIcon className='size-3' />
										<span>{group.name}</span>
									</div>
								}
							>
								{group.projects.map(project => (
									<CommandItem
										key={project.id}
										value={project.id}
										onSelect={() => handleSelect(project.id)}
										className='pl-8'
									>
										<Check
											className={cn(
												'size-4',
												selectedValue === project.id ? 'opacity-100' : 'opacity-0'
											)}
										/>
										<div className='flex items-center gap-2'>
											<span className='font-mono text-xs text-slate-500'>{project.key}</span>
											<span>{project.name}</span>
										</div>
									</CommandItem>
								))}
							</CommandGroup>
						))}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
