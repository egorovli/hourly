import type { EventChangesSummary } from '../model/types.ts'

import { AlertCircle, Check, X, Trash2, MoreVertical } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '~/shared/ui/shadcn/ui/button.tsx'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '~/shared/ui/shadcn/ui/dialog.tsx'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '~/shared/ui/shadcn/ui/dropdown-menu.tsx'

export interface WorklogCalendarActionsProps {
	changesSummary: EventChangesSummary
	onSave: () => Promise<void>
	onCancel: () => void
	onDeleteAll?: () => void
	localEventsCount?: number
	isSaving: boolean
	saveError: Error | null
}

export function WorklogCalendarActions({
	changesSummary,
	onSave,
	onCancel,
	onDeleteAll,
	localEventsCount = 0,
	isSaving,
	saveError
}: WorklogCalendarActionsProps): React.ReactNode {
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

	// Show error toast when save fails
	useEffect(() => {
		if (saveError) {
			toast.error('Failed to save changes', {
				description: saveError.message,
				action: {
					label: 'Retry',
					onClick: () => onSave()
				}
			})
		}
	}, [saveError, onSave])

	const hasEntries = localEventsCount > 0
	const showActions = changesSummary.hasChanges || hasEntries

	if (!showActions) {
		return null
	}

	const handleSave = async () => {
		try {
			await onSave()
			toast.success('Changes saved successfully', {
				description: `Updated ${changesSummary.totalChanges} worklog ${changesSummary.totalChanges === 1 ? 'entry' : 'entries'}`
			})
		} catch {
			// Error is handled by useEffect above
		}
	}

	const handleDeleteAll = () => {
		if (onDeleteAll) {
			onDeleteAll()
			setDeleteDialogOpen(false)
			toast.success('All entries deleted', {
				description: `Removed ${localEventsCount} worklog ${localEventsCount === 1 ? 'entry' : 'entries'}`
			})
		}
	}

	return (
		<>
			<div className='flex items-center gap-3 p-3 border-b bg-muted/30'>
				<div className='flex-1'>
					{changesSummary.hasChanges ? (
						<>
							<p className='text-sm font-medium'>
								{changesSummary.totalChanges} unsaved{' '}
								{changesSummary.totalChanges === 1 ? 'change' : 'changes'}
							</p>
							<p className='text-xs text-muted-foreground'>
								Events have been modified. Save or cancel to continue.
							</p>
							{saveError && (
								<p className='text-xs text-destructive flex items-center gap-1 mt-1'>
									<AlertCircle className='h-3 w-3' />
									{saveError.message}
								</p>
							)}
						</>
					) : (
						<p className='text-sm font-medium'>
							{localEventsCount} worklog {localEventsCount === 1 ? 'entry' : 'entries'} in calendar
						</p>
					)}
				</div>
				<div className='flex gap-2'>
					{changesSummary.hasChanges && (
						<>
							<Button
								size='sm'
								variant='outline'
								onClick={onCancel}
								disabled={isSaving}
							>
								<X className='h-4 w-4' />
								Cancel
							</Button>
							<Button
								size='sm'
								onClick={handleSave}
								disabled={isSaving}
							>
								<Check className='h-4 w-4' />
								{isSaving ? 'Saving...' : 'Save Changes'}
							</Button>
						</>
					)}
					{hasEntries && onDeleteAll && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									size='sm'
									variant='ghost'
									disabled={isSaving}
									className='h-8 w-8 p-0'
								>
									<MoreVertical className='h-4 w-4' />
									<span className='sr-only'>More options</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align='end'>
								<DropdownMenuItem
									variant='destructive'
									onSelect={() => setDeleteDialogOpen(true)}
								>
									<Trash2 className='h-4 w-4' />
									Delete All
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
			</div>

			<Dialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete all entries?</DialogTitle>
						<DialogDescription>
							This will delete all {localEventsCount} worklog{' '}
							{localEventsCount === 1 ? 'entry' : 'entries'} from the calendar. This action cannot
							be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setDeleteDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							variant='destructive'
							onClick={handleDeleteAll}
						>
							Delete All
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
