import type {
	CalendarProps,
	DayPropGetter,
	EventPropGetter,
	SlotPropGetter,
	View,
	EventProps
} from 'react-big-calendar'
import type { EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop'
import type { DateRange } from 'react-day-picker'

import type { DragEvent as ReactDragEvent, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { DateTime, Settings } from 'luxon'

import type { WorklogCalendarEvent } from '~/entities/index.ts'
import type { CalendarCompactMode } from '~/domain/preferences.ts'

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

interface ExternalIssueDragItem {
	id: string
	key: string
	summary: string
	projectKey: string
	projectName: string
}

const EXTERNAL_DRAG_DEFAULT_DURATION_MS = 30 * 60 * 1000

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
	externalIssue?: ExternalIssueDragItem | null
	onDropFromOutside?: (args: {
		start: Date
		end: Date
		allDay: boolean
		issue: ExternalIssueDragItem | null
	}) => void
	onLocalEventsChange?: (events: WorklogCalendarEvent[]) => void
	dateRange?: DateRange
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
	externalIssue = null,
	onDropFromOutside,
	onLocalEventsChange,
	dateRange
}: WorklogsCalendarProps): ReactNode {
	// Use local state management with change tracking
	const {
		localEvents,
		changesSummary,
		handleEventResize,
		handleEventDrop,
		handleCreateEvent,
		handleDeleteEvent: handleDeleteEventFromState,
		handleDeleteAllEvents,
		handleSave,
		handleCancel,
		isSaving,
		saveError,
		getWorklogChanges
	} = useCalendarEventsState({
		events,
		dateRange,
		currentUserAccountId
	})

	// Dialog state management
	const [dialogOpen, setDialogOpen] = useState(false)
	const [dialogMode, setDialogMode] = useState<EventDialogMode>('create')
	const [selectedEvent, setSelectedEvent] = useState<WorklogCalendarEvent | undefined>(undefined)

	// Draft event state (for visual feedback while dragging)
	const [draftEvent, setDraftEvent] = useState<WorklogCalendarEvent | null>(null)

	// Track Alt/Option key state for duplication
	const [isAltKeyPressed, setIsAltKeyPressed] = useState(false)

	// Track dragging state for duplication preview
	const [draggedEventForDuplication, setDraggedEventForDuplication] = useState<{
		event: WorklogCalendarEvent
		originalStart: Date
		originalEnd: Date
	} | null>(null)

	// Track current drag position for preview
	const [currentDragPosition, setCurrentDragPosition] = useState<{ start: Date; end: Date } | null>(
		null
	)

	// Track Alt/Option key for duplication
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Alt key on Windows/Linux, Option key on Mac (both report as 'Alt')
			if (e.key === 'Alt') {
				setIsAltKeyPressed(true)
			}
		}

		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.key === 'Alt') {
				setIsAltKeyPressed(false)
				// Clear duplication preview when Alt is released
				setDraggedEventForDuplication(null)
				setCurrentDragPosition(null)
			}
		}

		const handleBlur = () => {
			// Reset on window blur (user switches tabs/apps)
			setIsAltKeyPressed(false)
			setDraggedEventForDuplication(null)
			setCurrentDragPosition(null)
		}

		window.addEventListener('keydown', handleKeyDown)
		window.addEventListener('keyup', handleKeyUp)
		window.addEventListener('blur', handleBlur)

		return () => {
			window.removeEventListener('keydown', handleKeyDown)
			window.removeEventListener('keyup', handleKeyUp)
			window.removeEventListener('blur', handleBlur)
		}
	}, [])

	// Handle drag start - capture original position when Alt is pressed
	const handleDragStart = useCallback(
		(args: { event: WorklogCalendarEvent; action: string; direction: string }) => {
			// Clear any previous drag state when starting a new drag
			setDraggedEventForDuplication(null)
			setCurrentDragPosition(null)

			if (isAltKeyPressed) {
				// Store original event and position for duplication preview
				setDraggedEventForDuplication({
					event: args.event,
					originalStart: DateTime.fromJSDate(args.event.start).toJSDate(),
					originalEnd: DateTime.fromJSDate(args.event.end).toJSDate()
				})
			}
		},
		[isAltKeyPressed]
	)

	useEffect(() => {
		if (!onLocalEventsChange) {
			return
		}

		onLocalEventsChange(localEvents)
	}, [localEvents, onLocalEventsChange])

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
					timeSpentSeconds: Math.floor(
						DateTime.fromJSDate(range.end).diff(DateTime.fromJSDate(range.start), 'seconds').seconds
					),
					started: DateTime.fromJSDate(range.start).toISO() ?? ''
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
			const timeDiffMs = DateTime.fromJSDate(slotInfo.end).diff(
				DateTime.fromJSDate(slotInfo.start),
				'milliseconds'
			).milliseconds
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

	// Track drag position during Alt+drag
	useEffect(() => {
		if (!draggedEventForDuplication) {
			setCurrentDragPosition(null)
			return
		}

		// Find the dragged event in localEvents to get current drag position
		const draggedEvent = localEvents.find(e => e.id === draggedEventForDuplication.event.id)
		if (draggedEvent) {
			const hasMoved =
				DateTime.fromJSDate(draggedEvent.start).toMillis() !==
					DateTime.fromJSDate(draggedEventForDuplication.originalStart).toMillis() ||
				DateTime.fromJSDate(draggedEvent.end).toMillis() !==
					DateTime.fromJSDate(draggedEventForDuplication.originalEnd).toMillis()

			if (hasMoved) {
				// Update preview position during drag
				setCurrentDragPosition({
					start: DateTime.fromJSDate(draggedEvent.start).toJSDate(),
					end: DateTime.fromJSDate(draggedEvent.end).toJSDate()
				})
			}
		}
	}, [localEvents, draggedEventForDuplication])

	// Handle event drop with Alt/Option key detection for duplication
	const handleEventDropWithDuplication = useCallback(
		(args: EventInteractionArgs<WorklogCalendarEvent>) => {
			const { event, start } = args

			// Convert start to Date if it's a string
			const startDate =
				start instanceof Date
					? DateTime.fromJSDate(start).toJSDate()
					: DateTime.fromISO(start).toJSDate()

			// Check if Alt/Option is currently pressed (check actual key state at drop time)
			// Note: This checks the tracked state, which should be accurate if Alt is held during drag
			if (isAltKeyPressed && draggedEventForDuplication) {
				// Restore original event position (prevent move)
				const originalDuration = DateTime.fromJSDate(draggedEventForDuplication.originalEnd).diff(
					DateTime.fromJSDate(draggedEventForDuplication.originalStart),
					'milliseconds'
				).milliseconds
				const restoredEvent: WorklogCalendarEvent = {
					...event,
					start: draggedEventForDuplication.originalStart,
					end: draggedEventForDuplication.originalEnd,
					resource: {
						...event.resource,
						timeSpentSeconds: Math.floor(originalDuration / 1000),
						started: DateTime.fromJSDate(draggedEventForDuplication.originalStart).toISO() ?? ''
					}
				}

				// Restore original position in local events
				handleEventDrop({
					...args,
					event: restoredEvent,
					start: draggedEventForDuplication.originalStart,
					end: draggedEventForDuplication.originalEnd
				})

				// Calculate duration for duplicate
				const duplicateDuration = DateTime.fromJSDate(draggedEventForDuplication.originalEnd).diff(
					DateTime.fromJSDate(draggedEventForDuplication.originalStart),
					'milliseconds'
				).milliseconds
				const newEnd = DateTime.fromJSDate(startDate)
					.plus({ milliseconds: duplicateDuration })
					.toJSDate()

				// Create duplicate event with same issue data
				handleCreateEvent(
					startDate,
					newEnd,
					currentUserAccountId ?? '',
					currentUserName ?? 'Current User',
					event.resource.projectName,
					{
						issueKey: event.resource.issueKey,
						issueSummary: event.resource.issueSummary
					}
				)

				// Clear duplication preview (but keep Alt key state - it's handled by keyup handler)
				setDraggedEventForDuplication(null)
				setCurrentDragPosition(null)
			} else {
				// Clear duplication preview if it exists
				setDraggedEventForDuplication(null)
				setCurrentDragPosition(null)
				// Normal move behavior
				handleEventDrop(args)
			}
		},
		[
			isAltKeyPressed,
			draggedEventForDuplication,
			currentUserAccountId,
			currentUserName,
			handleCreateEvent,
			handleEventDrop
		]
	)

	// Handle external drop (from search panel)
	const handleDropFromOutside = useCallback(
		(args: { start: Date | string; end: Date | string; allDay: boolean }) => {
			// Only create if user is authenticated and issue is available
			if (!currentUserAccountId || !externalIssue) {
				return
			}

			const start =
				typeof args.start === 'string' ? DateTime.fromISO(args.start).toJSDate() : args.start
			const end = typeof args.end === 'string' ? DateTime.fromISO(args.end).toJSDate() : args.end

			// Ensure minimum duration of 15 minutes
			const minDuration = 15 * 60 * 1000 // 15 minutes in milliseconds
			const startDt = DateTime.fromJSDate(start)
			const endDt = DateTime.fromJSDate(end)
			const durationMs = endDt.diff(startDt, 'milliseconds').milliseconds
			const actualEnd =
				durationMs < minDuration ? startDt.plus({ milliseconds: minDuration }).toJSDate() : end

			// Create the event with issue data
			handleCreateEvent(
				start,
				actualEnd,
				currentUserAccountId,
				currentUserName ?? 'Current User',
				externalIssue.projectName,
				{
					issueKey: externalIssue.key,
					issueSummary: externalIssue.summary
				}
			)

			// Notify parent component if callback is provided
			onDropFromOutside?.({
				start,
				end: actualEnd,
				allDay: args.allDay,
				issue: externalIssue
			})
		},
		[onDropFromOutside, externalIssue, currentUserAccountId, currentUserName, handleCreateEvent]
	)

	const handleDragOver = useCallback(
		(event: ReactDragEvent) => {
			if (!externalIssue) {
				return
			}

			event.preventDefault()
			if (event.dataTransfer) {
				event.dataTransfer.dropEffect = 'copy'
			}
		},
		[externalIssue]
	)

	const dragFromOutsideItem = useCallback((): WorklogCalendarEvent | null => {
		if (!externalIssue) {
			return null
		}

		const previewStart = DateTime.fromMillis(0).toJSDate()
		const previewEnd = DateTime.fromMillis(EXTERNAL_DRAG_DEFAULT_DURATION_MS).toJSDate()
		const startedIso = DateTime.now().toISO() ?? ''

		return {
			id: `external-${externalIssue.id}`,
			title: `${externalIssue.key} • ${externalIssue.summary}`,
			start: previewStart,
			end: previewEnd,
			resource: {
				issueKey: externalIssue.key,
				issueSummary: externalIssue.summary,
				projectName: externalIssue.projectName,
				authorName: currentUserName ?? 'Current User',
				authorAccountId: currentUserAccountId ?? '',
				timeSpentSeconds: Math.floor(EXTERNAL_DRAG_DEFAULT_DURATION_MS / 1000),
				started: startedIso
			}
		} as WorklogCalendarEvent
	}, [externalIssue, currentUserName, currentUserAccountId])

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
		let events = [...localEvents]

		// If Alt+drag is active, keep original event in place and show preview
		if (draggedEventForDuplication) {
			// Restore original event position (prevent visual move)
			events = events.map(e => {
				if (e.id === draggedEventForDuplication.event.id) {
					return {
						...e,
						start: draggedEventForDuplication.originalStart,
						end: draggedEventForDuplication.originalEnd
					}
				}
				return e
			})

			// Add duplication preview at current drag position
			if (currentDragPosition) {
				const previewEvent: WorklogCalendarEvent = {
					...draggedEventForDuplication.event,
					id: `duplicate-preview-${draggedEventForDuplication.event.id}`,
					start: currentDragPosition.start,
					end: currentDragPosition.end
				}
				events = [...events, previewEvent]
			}
		}

		// Add draft event for new event creation
		if (draftEvent) {
			events = [...events, draftEvent]
		}

		return events
	}, [localEvents, draftEvent, draggedEventForDuplication, currentDragPosition])

	// Calculate dynamic min/max based on local events with 30min padding
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: time-range normalization handles multiple edge cases for calendar display
	// biome-ignore lint/correctness/useExhaustiveDependencies: Settings.defaultZone.name is intentionally included to trigger recalculation when timezone changes
	const dynamicMinMax = useMemo(() => {
		const base = date ? DateTime.fromJSDate(date) : DateTime.now()

		// Parse working hours settings
		const [startHourStr, startMinStr] = workingDayStartTime.split(':').map(Number)
		const [endHourStr, endMinStr] = workingDayEndTime.split(':').map(Number)

		// Start with working hours minus/plus 30 minutes padding
		const startMinutes = (startHourStr ?? 9) * 60 + (startMinStr ?? 0) - 30
		const endMinutes = (endHourStr ?? 18) * 60 + (endMinStr ?? 0) + 30

		let minHour = Math.floor(Math.max(0, startMinutes) / 60)
		let minMinutes = Math.max(0, startMinutes) % 60
		let maxHour = Math.floor(Math.min(24 * 60, endMinutes) / 60)
		let maxMinutes = Math.min(24 * 60, endMinutes) % 60

		// Scan through all display events (including local changes and draft)
		if (displayEvents.length > 0) {
			// Get start of day in the user's timezone using Luxon
			// DateTime.fromJSDate uses Settings.defaultZone automatically
			const baseDateTime = base instanceof Date ? DateTime.fromJSDate(base) : base
			const startOfDayLocal = baseDateTime.startOf('day')

			for (const event of displayEvents) {
				// Convert event dates to Luxon DateTime in user's timezone
				const eventStartLocal = DateTime.fromJSDate(event.start)
				const eventEndLocal = DateTime.fromJSDate(event.end)

				// Calculate minutes since midnight in the user's timezone
				const eventStartMinutes = Math.floor(
					eventStartLocal.diff(startOfDayLocal, 'minutes').minutes
				)
				const eventEndMinutes = Math.floor(eventEndLocal.diff(startOfDayLocal, 'minutes').minutes)

				// Ensure valid values
				if (Number.isNaN(eventStartMinutes) || Number.isNaN(eventEndMinutes)) {
					continue
				}

				// Clamp to valid range (0-1440 minutes = 24 hours)
				const clampedStartMinutes = Math.max(0, Math.min(1440, eventStartMinutes))
				const clampedEndMinutes = Math.max(0, Math.min(1440, eventEndMinutes))

				// Current min/max in minutes
				const currentMinMinutes = minHour * 60 + minMinutes
				const currentMaxMinutes = maxHour * 60 + maxMinutes

				// Expand range if event is outside, with 30min padding
				if (clampedStartMinutes < currentMinMinutes) {
					const paddedStart = Math.max(0, clampedStartMinutes - 30)
					minHour = Math.floor(paddedStart / 60)
					minMinutes = paddedStart % 60
				}
				if (clampedEndMinutes > currentMaxMinutes) {
					const paddedEnd = Math.min(24 * 60, clampedEndMinutes + 30)
					maxHour = Math.floor(paddedEnd / 60)
					maxMinutes = paddedEnd % 60
				}
			}
		}

		// Create Date objects using Luxon to ensure correct timezone handling
		// IMPORTANT: React Big Calendar expects min/max to be Date objects on the same day
		// We create DateTime objects in the user's timezone, then convert to JS Date
		// The localizer will handle displaying them in the correct timezone
		const baseDateTime = base instanceof Date ? DateTime.fromJSDate(base) : base

		// Get the start of day in the user's timezone
		const startOfDayInTimezone = baseDateTime.startOf('day')

		// Create DateTime objects in the user's timezone with the calculated hours/minutes
		const minDateTime = startOfDayInTimezone.plus({ hours: minHour, minutes: minMinutes })
		const maxDateTime = startOfDayInTimezone.plus({ hours: maxHour, minutes: maxMinutes })

		// Convert to JS Date objects
		// These represent absolute moments in time that will be displayed correctly by the localizer
		const calculatedMin = minDateTime.toJSDate()
		const calculatedMax = maxDateTime.toJSDate()

		// Ensure both dates are valid and min < max
		// Also ensure they're on the same calendar day (react-big-calendar requirement)
		if (
			!calculatedMin ||
			!calculatedMax ||
			calculatedMin >= calculatedMax ||
			Number.isNaN(calculatedMin.getTime()) ||
			Number.isNaN(calculatedMax.getTime())
		) {
			// Fallback to safe defaults using Luxon
			const defaultStart = startOfDayInTimezone.plus({ hours: 8 }).toJSDate()
			const defaultEnd = startOfDayInTimezone.plus({ hours: 18 }).toJSDate()
			return { min: defaultStart, max: defaultEnd }
		}

		// Additional validation: ensure min and max are on the same day in the user's timezone
		// This is critical for react-big-calendar's getSlotMetrics function
		// Compare dates in the user's timezone, not UTC
		const minDateInTimezone = DateTime.fromJSDate(calculatedMin)
		const maxDateInTimezone = DateTime.fromJSDate(calculatedMax)
		const minDateStr = minDateInTimezone.toFormat('yyyy-MM-dd')
		const maxDateStr = maxDateInTimezone.toFormat('yyyy-MM-dd')

		if (minDateStr !== maxDateStr) {
			// If they're on different days in the user's timezone, clamp max to end of min's day
			const endOfMinDay = startOfDayInTimezone.endOf('day')
			const clampedMax = Math.min(calculatedMax.getTime(), endOfMinDay.toJSDate().getTime())
			const calculatedMaxClamped = DateTime.fromMillis(clampedMax).toJSDate()

			// Ensure clamped max is still > min
			if (calculatedMaxClamped <= calculatedMin) {
				const defaultStart = startOfDayInTimezone.plus({ hours: 8 }).toJSDate()
				const defaultEnd = startOfDayInTimezone.plus({ hours: 18 }).toJSDate()
				return { min: defaultStart, max: defaultEnd }
			}

			return { min: calculatedMin, max: calculatedMaxClamped }
		}

		// Final validation: ensure min and max are on the same UTC day
		// React Big Calendar's getSlotMetrics calculates slots based on UTC dates internally
		// so we need to ensure they're on the same UTC day to avoid "invalid array length" errors
		const minUTC = DateTime.fromJSDate(calculatedMin, { zone: 'utc' })
		const maxUTC = DateTime.fromJSDate(calculatedMax, { zone: 'utc' })
		const minUTCDateStr = minUTC.toFormat('yyyy-MM-dd')
		const maxUTCDateStr = maxUTC.toFormat('yyyy-MM-dd')

		if (minUTCDateStr !== maxUTCDateStr) {
			// If they're on different UTC days, clamp max to end of min's UTC day
			const endOfMinUTCDay = minUTC.endOf('day')
			const clampedMax = Math.min(calculatedMax.getTime(), endOfMinUTCDay.toJSDate().getTime())
			const calculatedMaxClamped = DateTime.fromMillis(clampedMax).toJSDate()

			// Ensure clamped max is still > min
			if (calculatedMaxClamped <= calculatedMin) {
				const defaultStart = startOfDayInTimezone.plus({ hours: 8 }).toJSDate()
				const defaultEnd = startOfDayInTimezone.plus({ hours: 18 }).toJSDate()
				return { min: defaultStart, max: defaultEnd }
			}

			return { min: calculatedMin, max: calculatedMaxClamped }
		}

		return { min: calculatedMin, max: calculatedMax }
		// Note: DateTime.fromJSDate uses Settings.defaultZone automatically when called
		// When timezone changes, Settings.defaultZone changes, which triggers recalculation
	}, [date, displayEvents, workingDayStartTime, workingDayEndTime, Settings.defaultZone.name])

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

			// Apply duplication preview styling
			if (event.id.startsWith('duplicate-preview-')) {
				return {
					className: 'worklog-calendar__event--duplicate-preview',
					style: {
						backgroundColor: 'rgba(34, 197, 94, 0.3)',
						border: '2px dashed rgba(34, 197, 94, 0.8)',
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
			<div className='flex h-full flex-col'>
				<WorklogCalendarActions
					changesSummary={changesSummary}
					onSave={handleSave}
					onCancel={handleCancel}
					onDeleteAll={handleDeleteAllEvents}
					localEventsCount={localEvents.length}
					isSaving={isSaving}
					saveError={saveError}
					getWorklogChanges={getWorklogChanges}
				/>
				<SlotContextMenu
					onCreate={handleCreateEventClick}
					onDeleteAll={handleDeleteAllEvents}
					localEventsCount={localEvents.length}
				>
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
								onEventDrop={handleEventDropWithDuplication}
								onDragStart={handleDragStart}
								onSelecting={handleSelecting}
								onSelectSlot={handleSelectSlot}
								onDoubleClickEvent={handleDoubleClickEvent}
								onDropFromOutside={handleDropFromOutside}
								onDragOver={handleDragOver}
								dragFromOutsideItem={dragFromOutsideItem as () => WorklogCalendarEvent}
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
