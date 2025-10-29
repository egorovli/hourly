import type { WorklogCalendarEvent } from '~/entities/index.ts'
import { EditIcon, Trash2Icon, XIcon } from 'lucide-react'
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator
} from '~/shared/ui/shadcn/ui/context-menu.tsx'

interface EventContextMenuProps {
	children: React.ReactNode
	event: WorklogCalendarEvent
	onEdit: (event: WorklogCalendarEvent) => void
	onDelete: (event: WorklogCalendarEvent) => void
	currentUserAccountId?: string
}

export function EventContextMenu({
	children,
	event,
	onEdit,
	onDelete,
	currentUserAccountId
}: EventContextMenuProps): React.ReactNode {
	const isOwnedByUser = currentUserAccountId
		? event.resource.authorAccountId === currentUserAccountId
		: false

	const handleEdit = () => {
		if (isOwnedByUser) {
			onEdit(event)
		}
	}

	const handleDelete = () => {
		if (isOwnedByUser) {
			onDelete(event)
		}
	}

	return (
		<ContextMenu>
			{children}
			<ContextMenuContent>
				<ContextMenuItem
					onSelect={handleEdit}
					disabled={!isOwnedByUser}
				>
					<EditIcon className='size-4' />
					Edit Event
				</ContextMenuItem>
				<ContextMenuItem
					variant='destructive'
					onSelect={handleDelete}
					disabled={!isOwnedByUser}
				>
					<Trash2Icon className='size-4' />
					Delete Event
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem onSelect={e => e.preventDefault()}>
					<XIcon className='size-4' />
					Cancel
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	)
}
