import type { EventApi } from '@fullcalendar/core'

import { CopyIcon, ExternalLinkIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuTrigger
} from '~/components/shadcn/ui/context-menu.tsx'

interface CalendarEventContextMenuProps {
	children: React.ReactNode
	event: EventApi
	isEditable: boolean
	onDelete: (eventId: string) => void
	jiraBaseUrl?: string
}

function CalendarEventContextMenu({
	children,
	event,
	isEditable,
	onDelete,
	jiraBaseUrl
}: CalendarEventContextMenuProps): React.ReactNode {
	const issueKey = event.extendedProps['issueKey'] as string | undefined
	const eventId = event.id

	function handleDelete(): void {
		if (eventId) {
			onDelete(eventId)
		}
	}

	function handleCopyIssueKey(): void {
		if (issueKey) {
			navigator.clipboard.writeText(issueKey)
			toast.success('Copied to clipboard', {
				description: issueKey
			})
		}
	}

	function handleViewInJira(): void {
		if (issueKey && jiraBaseUrl) {
			window.open(`${jiraBaseUrl}/browse/${issueKey}`, '_blank', 'noopener,noreferrer')
		}
	}

	const hasIssueKey = typeof issueKey === 'string' && issueKey.length > 0
	const hasJiraUrl = typeof jiraBaseUrl === 'string' && jiraBaseUrl.length > 0

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent className='w-48'>
				<ContextMenuItem
					variant='destructive'
					disabled={!isEditable}
					onClick={handleDelete}
				>
					<Trash2Icon className='mr-2 size-4' />
					Delete
					<ContextMenuShortcut>Del</ContextMenuShortcut>
				</ContextMenuItem>

				<ContextMenuSeparator />

				<ContextMenuItem
					disabled={!hasIssueKey}
					onClick={handleCopyIssueKey}
				>
					<CopyIcon className='mr-2 size-4' />
					Copy Issue Key
				</ContextMenuItem>

				<ContextMenuItem
					disabled={!hasIssueKey || !hasJiraUrl}
					onClick={handleViewInJira}
				>
					<ExternalLinkIcon className='mr-2 size-4' />
					View in Jira
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	)
}

export { CalendarEventContextMenu }
