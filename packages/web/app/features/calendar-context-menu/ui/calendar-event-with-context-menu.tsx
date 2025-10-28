import type { EventProps } from 'react-big-calendar'
import type { WorklogCalendarEvent } from '~/entities/index.ts'
import { ContextMenuTrigger } from '~/shared/ui/shadcn/ui/context-menu.tsx'
import { EventContextMenu } from './event-context-menu.tsx'

interface CalendarEventWithContextMenuProps {
	eventProps: EventProps<WorklogCalendarEvent>
	EventComponent: React.ComponentType<EventProps<WorklogCalendarEvent>>
	onEdit: (event: WorklogCalendarEvent) => void
	onDelete: (event: WorklogCalendarEvent) => void
}

export function CalendarEventWithContextMenu({
	eventProps,
	EventComponent,
	onEdit,
	onDelete
}: CalendarEventWithContextMenuProps): React.ReactNode {
	return (
		<EventContextMenu
			event={eventProps.event}
			onEdit={onEdit}
			onDelete={onDelete}
		>
			<ContextMenuTrigger asChild>
				<div className='h-full w-full'>
					<EventComponent {...eventProps} />
				</div>
			</ContextMenuTrigger>
		</EventContextMenu>
	)
}
