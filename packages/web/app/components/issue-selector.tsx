import type { JiraIssueSearchResult } from '~/lib/atlassian/issue.ts'

import { useCallback, useState } from 'react'
import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from 'lucide-react'

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

export interface IssueSelectorProps {
	/**
	 * List of available issues to select from
	 */
	issues: JiraIssueSearchResult[]

	/**
	 * Currently selected issue key (e.g., "PROJ-123")
	 */
	selectedIssueKey: string | undefined

	/**
	 * Callback when an issue is selected
	 */
	onSelect: (issue: JiraIssueSearchResult) => void

	/**
	 * Callback when search query changes
	 */
	onSearchChange?: (query: string) => void

	/**
	 * Whether the selector is loading issues
	 */
	isLoading?: boolean

	/**
	 * Whether the selector is disabled
	 */
	disabled?: boolean

	/**
	 * Placeholder text when no issue is selected
	 */
	placeholder?: string

	/**
	 * Additional class name for the trigger button
	 */
	className?: string
}

/**
 * Issue selector component for linking/changing issues on calendar events.
 *
 * Features:
 * - Searchable dropdown with issue list
 * - Displays issue key and summary
 * - Works on both mobile and desktop
 * - Supports keyboard navigation
 */
export function IssueSelector(props: IssueSelectorProps): React.ReactNode {
	const {
		issues,
		selectedIssueKey,
		onSelect,
		onSearchChange,
		isLoading = false,
		disabled = false,
		placeholder = 'Select issue...',
		className
	} = props

	const [open, setOpen] = useState(false)
	const [searchValue, setSearchValue] = useState('')

	const selectedIssue = issues.find(issue => issue.key === selectedIssueKey)

	const handleSearchChange = useCallback(
		(value: string) => {
			setSearchValue(value)
			onSearchChange?.(value)
		},
		[onSearchChange]
	)

	const handleSelect = useCallback(
		(issueKey: string) => {
			const issue = issues.find(i => i.key === issueKey)
			if (issue) {
				onSelect(issue)
				setOpen(false)
				setSearchValue('')
			}
		},
		[issues, onSelect]
	)

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
					disabled={disabled}
					className={cn('w-full justify-between text-left font-normal', className)}
				>
					{selectedIssue ? (
						<span className='flex items-center gap-2 truncate'>
							<span className='font-medium text-primary'>{selectedIssue.key}</span>
							<span className='truncate text-muted-foreground'>{selectedIssue.fields.summary}</span>
						</span>
					) : (
						<span className='text-muted-foreground'>{placeholder}</span>
					)}
					<ChevronsUpDownIcon className='ml-2 size-4 shrink-0 opacity-50' />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className='w-[--radix-popover-trigger-width] p-0'
				align='start'
			>
				<Command shouldFilter={false}>
					<CommandInput
						placeholder='Search issues...'
						value={searchValue}
						onValueChange={handleSearchChange}
					/>
					<CommandList>
						{isLoading ? (
							<div className='flex items-center justify-center py-6'>
								<SearchIcon className='mr-2 size-4 animate-pulse' />
								<span className='text-sm text-muted-foreground'>Searching...</span>
							</div>
						) : issues.length === 0 ? (
							<CommandEmpty>No issues found.</CommandEmpty>
						) : (
							<CommandGroup>
								{issues.map(issue => (
									<CommandItem
										key={issue.id}
										value={issue.key}
										onSelect={handleSelect}
										className='flex items-center gap-2'
									>
										<CheckIcon
											className={cn(
												'size-4 shrink-0',
												selectedIssueKey === issue.key ? 'opacity-100' : 'opacity-0'
											)}
										/>
										<span className='font-medium text-primary'>{issue.key}</span>
										<span className='truncate text-muted-foreground'>{issue.fields.summary}</span>
									</CommandItem>
								))}
							</CommandGroup>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
