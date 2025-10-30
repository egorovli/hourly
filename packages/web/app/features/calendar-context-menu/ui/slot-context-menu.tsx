import { PlusIcon, XIcon, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator
} from '~/shared/ui/shadcn/ui/context-menu.tsx'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '~/shared/ui/shadcn/ui/dialog.tsx'
import { Button } from '~/shared/ui/shadcn/ui/button.tsx'

interface SlotContextMenuProps {
	children: React.ReactNode
	onCreate: () => void
	onDeleteAll?: () => void
	localEventsCount?: number
}

export function SlotContextMenu({
	children,
	onCreate,
	onDeleteAll,
	localEventsCount = 0
}: SlotContextMenuProps): React.ReactNode {
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

	const handleCreate = () => {
		onCreate()
	}

	const handleDeleteAllClick = () => {
		setDeleteDialogOpen(true)
	}

	const handleDeleteAll = () => {
		if (onDeleteAll) {
			onDeleteAll()
			setDeleteDialogOpen(false)
		}
	}

	const hasEntries = localEventsCount > 0

	return (
		<>
			<ContextMenu>
				{children}
				<ContextMenuContent>
					<ContextMenuItem onSelect={handleCreate}>
						<PlusIcon className='size-4' />
						Create Event
					</ContextMenuItem>
					{hasEntries && onDeleteAll && (
						<>
							<ContextMenuSeparator />
							<ContextMenuItem
								onSelect={handleDeleteAllClick}
								className='text-destructive focus:text-destructive'
							>
								<Trash2 className='size-4' />
								Delete All
							</ContextMenuItem>
						</>
					)}
					<ContextMenuSeparator />
					<ContextMenuItem onSelect={e => e.preventDefault()}>
						<XIcon className='size-4' />
						Cancel
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>

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
