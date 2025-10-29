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
	currentUserName?: string
	selectedProjectIds?: string[]
	projectsData?: Array<{ id: string; name: string; key: string }>
	workingDayStartTime?: string
	workingDayEndTime?: string
	onDropFromOutside?: (args: {
		start: Date
		end: Date
		allDay: boolean
		draggedEl: HTMLElement
	}) => void
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
	currentUserAccountId,
	currentUserName,
	selectedProjectIds,
	projectsData,
	workingDayStartTime = '09:00',
	workingDayEndTime = '18:00',
	onDropFromOutside
}: WorklogsCalendarProps): React.ReactNode {
	// Use local state management with change tracking
	const {
		localEvents,
		changesSummary,
		handleEventResize,
		handleEventDrop,
		handleCreateEvent,
		handleDeleteEvent: handleDeleteEventFromState,
		handleSave,
		handleCancel,
		isSaving,
		saveError
	} = useCalendarEventsState({ events })

	// Dialog state management
	const [dialogOpen, setDialogOpen] = useState(false)
	const [dialogMode, setDialogMode] = useState<EventDialogMode>('create')
	const [selectedEvent, setSelectedEvent] = useState<WorklogCalendarEvent | undefined>(undefined)

	// Draft event state (for visual feedback while dragging)
	const [draftEvent, setDraftEvent] = useState<WorklogCalendarEvent | null>(null)

	// Context menu handlers
	const handleEditEvent = useCallback((event: WorklogCalendarEvent) => {
		setSelectedEvent(event)
		setDialogMode('edit')
		setDialogOpen(true)
	}, [])

	const handleDeleteEvent = useCallback(
		(event: WorklogCalendarEvent) => {
			handleDeleteEventFromState(event.id)
		},
		[handleDeleteEventFromState]
	)

	const handleCreateEventClick = useCallback(() => {
		setSelectedEvent(undefined)
		setDialogMode('create')
		setDialogOpen(true)
	}, [])

	// Handle slot selecting (visual feedback while dragging)
	const handleSelecting = useCallback(
		(range: { start: Date; end: Date }): boolean | undefined => {
			// Only show draft if user is authenticated
			if (!currentUserAccountId) {
				return false
			}

			// Create draft event for visual feedback
			const draft: WorklogCalendarEvent = {
				id: 'draft-preview',
				title: 'New Event',
				start: range.start,
				end: range.end,
				resource: {
					issueKey: '',
					issueSummary: '',
					projectName: '',
					authorName: currentUserName ?? 'Current User',
					authorAccountId: currentUserAccountId,
					timeSpentSeconds: Math.floor((range.end.getTime() - range.start.getTime()) / 1000),
					started: range.start.toISOString()
				}
			}

			setDraftEvent(draft)
			return true // Allow the selection to continue
		},
		[currentUserAccountId, currentUserName]
	)

	// Handle slot selection (finalize event creation)
	const handleSelectSlot = useCallback(
		(slotInfo: { start: Date; end: Date }) => {
			// Clear draft
			setDraftEvent(null)

			// Only create if user is authenticated
			if (!currentUserAccountId) {
				return
			}

			// Prevent single-click creation - only allow actual drag
			const timeDiffMs = slotInfo.end.getTime() - slotInfo.start.getTime()
			if (timeDiffMs < 60000) {
				// Less than 1 minute = likely a click, not a drag
				return
			}

			// Determine project name if only one project is selected
			let projectName = ''
			if (selectedProjectIds?.length === 1 && projectsData) {
				const project = projectsData.find(p => p.id === selectedProjectIds[0])
				projectName = project?.name ?? project?.key ?? ''
			}

			// Create the event in local state (persisted)
			handleCreateEvent(
				slotInfo.start,
				slotInfo.end,
				currentUserAccountId,
				currentUserName ?? 'Current User',
				projectName
			)
		},
		[handleCreateEvent, currentUserAccountId, currentUserName, selectedProjectIds, projectsData]
	)

	// Handle double-click on event to edit
	const handleDoubleClickEvent = useCallback((event: WorklogCalendarEvent) => {
		setSelectedEvent(event)
		setDialogMode('edit')
		setDialogOpen(true)
	}, [])

	// Handle external drop (from search panel)
	const handleDropFromOutside = useCallback(
		(args: any) => {
			if (onDropFromOutside) {
				onDropFromOutside(args)
			}
		},
		[onDropFromOutside]
	)

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

	// Merge draft event with local events for display
	const displayEvents = useMemo(() => {
		return draftEvent ? [...localEvents, draftEvent] : localEvents
	}, [localEvents, draftEvent])

	// Calculate dynamic min/max based on local events with 30min padding
	const dynamicMinMax = useMemo(() => {
		const base = date ?? new Date()

		// Parse working hours settings
		const [startHourStr, startMinStr] = workingDayStartTime.split(':').map(Number)
		const [endHourStr, endMinStr] = workingDayEndTime.split(':').map(Number)

		const isInvalid =
			Number.isNaN(startHourStr) ||
			Number.isNaN(startMinStr) ||
			Number.isNaN(endHourStr) ||
			Number.isNaN(endMinStr)

		// Fallback defaults
		if (isInvalid) {
			const defaultStart = new Date(base)
			defaultStart.setHours(8, 0, 0, 0)
			const defaultEnd = new Date(base)
			defaultEnd.setHours(18, 0, 0, 0)
			return { min: defaultStart, max: defaultEnd }
		}

		// Start with working hours minus/plus 30 minutes padding
		const startMinutes = (startHourStr ?? 9) * 60 + (startMinStr ?? 0) - 30
		const endMinutes = (endHourStr ?? 18) * 60 + (endMinStr ?? 0) + 30

		let minHour = Math.floor(Math.max(0, startMinutes) / 60)
		let minMinutes = Math.max(0, startMinutes) % 60
		let maxHour = Math.floor(Math.min(24 * 60, endMinutes) / 60)
		let maxMinutes = Math.min(24 * 60, endMinutes) % 60

		// Scan through all display events (including local changes and draft)
		if (displayEvents.length > 0) {
			for (const event of displayEvents) {
				// Calculate event start/end in minutes since midnight
				const eventStartMinutes = event.start.getHours() * 60 + event.start.getMinutes()
				const eventEndMinutes = event.end.getHours() * 60 + event.end.getMinutes()

				// Current min/max in minutes
				const currentMinMinutes = minHour * 60 + minMinutes
				const currentMaxMinutes = maxHour * 60 + maxMinutes

				// Expand range if event is outside, with 30min padding
				if (eventStartMinutes < currentMinMinutes) {
					const paddedStart = Math.max(0, eventStartMinutes - 30)
					minHour = Math.floor(paddedStart / 60)
					minMinutes = paddedStart % 60
				}
				if (eventEndMinutes > currentMaxMinutes) {
					const paddedEnd = Math.min(24 * 60, eventEndMinutes + 30)
					maxHour = Math.floor(paddedEnd / 60)
					maxMinutes = paddedEnd % 60
				}
			}
		}

		const calculatedMin = new Date(base)
		calculatedMin.setHours(minHour, minMinutes, 0, 0)
		const calculatedMax = new Date(base)
		calculatedMax.setHours(maxHour, maxMinutes, 0, 0)

		return { min: calculatedMin, max: calculatedMax }
	}, [date, displayEvents, workingDayStartTime, workingDayEndTime])

	// Custom event prop getter to style draft events differently
	const customEventPropGetter = useCallback<EventPropGetter<WorklogCalendarEvent>>(
		(event, start, end, isSelected) => {
			// Apply draft styling for draft events
			if (event.id === 'draft-preview') {
				return {
					className: 'worklog-calendar__event--draft',
					style: {
						backgroundColor: 'rgba(59, 130, 246, 0.3)',
						border: '2px dashed rgba(59, 130, 246, 0.8)',
						opacity: 0.8
					}
				}
			}
			// Use the original event prop getter for other events
			return eventPropGetter?.(event, start, end, isSelected) ?? {}
		},
		[eventPropGetter]
	)

	const mergedComponents: CalendarProps<WorklogCalendarEvent>['components'] = {
		toolbar: CustomToolbar,
		event: EventWithContextMenu,
		...components
	}

	return (
		<>
			<div className='flex flex-col'>
				<WorklogCalendarActions
					changesSummary={changesSummary}
					onSave={handleSave}
					onCancel={handleCancel}
					isSaving={isSaving}
					saveError={saveError}
				/>
				<SlotContextMenu onCreate={handleCreateEventClick}>
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
								events={displayEvents}
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
								onSelecting={handleSelecting}
								onSelectSlot={handleSelectSlot}
								onDoubleClickEvent={handleDoubleClickEvent}
								onDropFromOutside={handleDropFromOutside}
								eventPropGetter={customEventPropGetter}
								dayPropGetter={dayPropGetter}
								slotPropGetter={slotPropGetter}
								showMultiDayTimes
								min={dynamicMinMax.min}
								max={dynamicMinMax.max}
								tooltipAccessor={event => event.title}
								selectable
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
