import { PlusIcon, XIcon } from 'lucide-react'
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator
} from '~/shared/ui/shadcn/ui/context-menu.tsx'

interface SlotContextMenuProps {
	children: React.ReactNode
	onCreate: () => void
}

export function SlotContextMenu({ children, onCreate }: SlotContextMenuProps): React.ReactNode {
	const handleCreate = () => {
		onCreate()
	}

	return (
		<ContextMenu>
			{children}
			<ContextMenuContent>
				<ContextMenuItem onSelect={handleCreate}>
					<PlusIcon className='size-4' />
					Create Event
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
