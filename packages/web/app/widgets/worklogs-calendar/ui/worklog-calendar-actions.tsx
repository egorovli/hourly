import type { EventChangesSummary } from '../model/types.ts'
import type { LocalWorklogEntry, WorklogChanges } from '~/entities/worklog/index.ts'

import { AlertCircle, Check, X, Trash2, MoreVertical } from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
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
import { ConfirmWorklogSaveDialog } from '~/features/confirm-worklog-save/index.ts'

export interface WorklogCalendarActionsProps {
	changesSummary: EventChangesSummary
	onSave: () => Promise<void>
	onCancel: () => void
	onDeleteAll?: () => void
	localEventsCount?: number
	isSaving: boolean
	saveError: Error | null
	getWorklogChanges: () => {
		newEntries: Array<{
			localId: string
			issueKey: string
			summary: string
			projectName: string
			authorName: string
			started: string
			timeSpentSeconds: number
			isNew?: boolean
		}>
		modifiedEntries: Array<{
			localId: string
			id?: string
			issueKey: string
			summary: string
			projectName: string
			authorName: string
			started: string
			timeSpentSeconds: number
		}>
		deletedEntries: Array<{
			localId: string
			id?: string
			issueKey: string
			summary: string
			projectName: string
			authorName: string
			started: string
			timeSpentSeconds: number
		}>
		totalChanges: number
	}
}

export function WorklogCalendarActions({
	changesSummary,
	onSave,
	onCancel,
	onDeleteAll,
	localEventsCount = 0,
	isSaving,
	saveError,
	getWorklogChanges
}: WorklogCalendarActionsProps): React.ReactNode {
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [saveDialogOpen, setSaveDialogOpen] = useState(false)

	// Convert worklog changes to WorklogChanges format for the dialog
	const worklogChanges = useMemo<WorklogChanges>(() => {
		const changes = getWorklogChanges()
		return {
			newEntries: changes.newEntries as LocalWorklogEntry[],
			modifiedEntries: changes.modifiedEntries as LocalWorklogEntry[],
			deletedEntries: changes.deletedEntries as LocalWorklogEntry[],
			hasChanges: changes.totalChanges > 0,
			changeCount: changes.totalChanges
		}
	}, [getWorklogChanges])

	// Show error toast when save fails
	useEffect(() => {
		if (saveError) {
			toast.error('Failed to save changes', {
				description: saveError.message,
				action: {
					label: 'Retry',
					onClick: () => setSaveDialogOpen(true)
				}
			})
		}
	}, [saveError])

	const handleSaveClick = useCallback(() => {
		setSaveDialogOpen(true)
	}, [])

	const handleConfirmSave = useCallback(async () => {
		try {
			await onSave()
			setSaveDialogOpen(false)
			toast.success('Changes saved successfully', {
				description: `Updated ${worklogChanges.changeCount} worklog ${worklogChanges.changeCount === 1 ? 'entry' : 'entries'}`
			})
		} catch {
			// Error is handled by useEffect above
		}
	}, [onSave, worklogChanges.changeCount])

	const handleDeleteAll = useCallback(() => {
		if (onDeleteAll) {
			onDeleteAll()
			setDeleteDialogOpen(false)
			toast.success('All entries deleted', {
				description: `Removed ${localEventsCount} worklog ${localEventsCount === 1 ? 'entry' : 'entries'}`
			})
		}
	}, [onDeleteAll, localEventsCount])

	const hasEntries = localEventsCount > 0
	const showActions = changesSummary.hasChanges || hasEntries

	if (!showActions) {
		return null
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
								onClick={handleSaveClick}
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

			<ConfirmWorklogSaveDialog
				open={saveDialogOpen}
				onOpenChange={setSaveDialogOpen}
				worklogChanges={worklogChanges}
				isSaving={isSaving}
				onConfirm={handleConfirmSave}
			/>
		</>
	)
}
