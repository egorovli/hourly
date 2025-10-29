import type { WorklogCalendarEvent } from '~/entities/index.ts'
import type { CalendarCompactMode } from '~/domain/preferences.ts'

import type {
	CalendarProps,
	DayPropGetter,
	EventPropGetter,
	SlotPropGetter,
	View,
	EventProps
} from 'react-big-calendar'

import { useCallback, useMemo, useState } from 'react'

import { DragAndDropCalendar } from '~/lib/calendar/drag-and-drop-calendar.client.tsx'
import { cn } from '~/lib/util/index.ts'
import { ContextMenuTrigger } from '~/shared/ui/shadcn/ui/context-menu.tsx'
import { SlotContextMenu } from '~/features/calendar-context-menu/index.ts'
import { EventContextMenu } from '~/features/calendar-context-menu/index.ts'
import { CalendarEventDialog } from '~/features/calendar-event-dialog/index.ts'
import type { EventDialogMode, EventFormData } from '~/features/calendar-event-dialog/index.ts'
import { useCalendarEventsState } from '../model/use-calendar-events-state.ts'

import { WorklogCalendarActions } from './worklog-calendar-actions.tsx'
import { WorklogCalendarEventContent } from './worklog-calendar-event.tsx'
import { WorklogCalendarToolbar } from './worklog-calendar-toolbar.tsx'

export interface WorklogsCalendarProps {
	date: Date
	view: View
	localizer: CalendarProps<WorklogCalendarEvent>['localizer']
	events: WorklogCalendarEvent[]
	formats: CalendarProps<WorklogCalendarEvent>['formats']
	components?: CalendarProps<WorklogCalendarEvent>['components']
	min: Date
	max: Date
	onNavigate: CalendarProps<WorklogCalendarEvent>['onNavigate']
	onView: CalendarProps<WorklogCalendarEvent>['onView']
	onRangeChange: CalendarProps<WorklogCalendarEvent>['onRangeChange']
	dayPropGetter?: DayPropGetter
	eventPropGetter?: EventPropGetter<WorklogCalendarEvent>
	slotPropGetter?: SlotPropGetter
	compactMode?: CalendarCompactMode
	onCompactModeChange?: (mode: CalendarCompactMode) => void
	currentUserAccountId?: string
}

export function WorklogsCalendar({
	date,
	view,
	localizer,
	events,
	formats,
	components,
	min,
	max,
	onNavigate,
	onView,
	onRangeChange,
	dayPropGetter,
	eventPropGetter,
	slotPropGetter,
	compactMode = 'standard',
	onCompactModeChange,
	currentUserAccountId
}: WorklogsCalendarProps): React.ReactNode {
	// Use local state management with change tracking
	const {
		localEvents,
		changesSummary,
		handleEventResize,
		handleEventDrop,
		handleSave,
		handleCancel,
		isSaving,
		saveError
	} = useCalendarEventsState({ events })

	// Dialog state management
	const [dialogOpen, setDialogOpen] = useState(false)
	const [dialogMode, setDialogMode] = useState<EventDialogMode>('create')
	const [selectedEvent, setSelectedEvent] = useState<WorklogCalendarEvent | undefined>(undefined)

	// Context menu handlers
	const handleEditEvent = useCallback((event: WorklogCalendarEvent) => {
		setSelectedEvent(event)
		setDialogMode('edit')
		setDialogOpen(true)
	}, [])

	const handleDeleteEvent = useCallback((event: WorklogCalendarEvent) => {
		// TODO: Implement delete event functionality
		// For now, this is a stub that will be connected to actual delete logic
		void event
	}, [])

	const handleCreateEvent = useCallback(() => {
		setSelectedEvent(undefined)
		setDialogMode('create')
		setDialogOpen(true)
	}, [])

	// Dialog save handler
	const handleDialogSave = useCallback(
		(data: EventFormData) => {
			// TODO: Implement save logic
			// This will be connected to the actual API to create/update worklog entries
			void data
			void dialogMode
			void selectedEvent
		},
		[dialogMode, selectedEvent]
	)

	// Create a custom toolbar component with compact mode props
	const CustomToolbar = useMemo(
		() =>
			function CustomToolbarWithCompactMode(props: any) {
				return (
					<WorklogCalendarToolbar
						{...props}
						compactMode={compactMode}
						onCompactModeChange={onCompactModeChange}
					/>
				)
			},
		[compactMode, onCompactModeChange]
	)

	// Create custom event component with context menu
	const EventWithContextMenu = useCallback(
		(eventProps: EventProps<WorklogCalendarEvent>) => {
			return (
				<EventContextMenu
					event={eventProps.event}
					onEdit={handleEditEvent}
					onDelete={handleDeleteEvent}
					currentUserAccountId={currentUserAccountId}
				>
					<ContextMenuTrigger asChild>
						<div className='h-full w-full'>
							<WorklogCalendarEventContent {...eventProps} />
						</div>
					</ContextMenuTrigger>
				</EventContextMenu>
			)
		},
		[handleEditEvent, handleDeleteEvent, currentUserAccountId]
	)

	const mergedComponents: CalendarProps<WorklogCalendarEvent>['components'] = {
		toolbar: CustomToolbar,
		event: EventWithContextMenu,
		...components
	}

	return (
		<>
			<div className='flex flex-col h-full'>
				<WorklogCalendarActions
					changesSummary={changesSummary}
					onSave={handleSave}
					onCancel={handleCancel}
					isSaving={isSaving}
					saveError={saveError}
				/>
				<SlotContextMenu onCreate={handleCreateEvent}>
					<ContextMenuTrigger asChild>
						<div className='flex-1 overflow-hidden'>
							<DragAndDropCalendar
								className={cn(
									'worklog-calendar',
									compactMode === 'comfortable' && 'worklog-calendar--comfortable',
									compactMode === 'compact' && 'worklog-calendar--compact'
								)}
								date={date}
								defaultView={view}
								events={localEvents}
								localizer={localizer}
								style={{ height: '100%' }}
								view={view}
								views={['month', 'week']}
								step={15}
								formats={formats}
								components={mergedComponents}
								onView={onView}
								onNavigate={onNavigate}
								onRangeChange={onRangeChange}
								onEventResize={handleEventResize}
								onEventDrop={handleEventDrop}
								eventPropGetter={eventPropGetter}
								dayPropGetter={dayPropGetter}
								slotPropGetter={slotPropGetter}
								showMultiDayTimes
								min={min}
								max={max}
								tooltipAccessor={event => event.title}
								resizable
								draggableAccessor={event =>
									currentUserAccountId
										? event.resource.authorAccountId === currentUserAccountId
										: false
								}
							/>
						</div>
					</ContextMenuTrigger>
				</SlotContextMenu>
			</div>

			{/* Event Dialog */}
			<CalendarEventDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				mode={dialogMode}
				event={selectedEvent}
				onSave={handleDialogSave}
			/>
		</>
	)
}
