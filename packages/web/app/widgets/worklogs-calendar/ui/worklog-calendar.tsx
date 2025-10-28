import type { WorklogCalendarEvent } from '~/entities/index.ts'
import type { CalendarCompactMode } from '~/domain/preferences.ts'

import type {
	CalendarProps,
	DayPropGetter,
	EventPropGetter,
	SlotPropGetter,
	View
} from 'react-big-calendar'

import { useMemo } from 'react'

import { DragAndDropCalendar } from '~/lib/calendar/drag-and-drop-calendar.client.tsx'
import { cn } from '~/lib/util/index.ts'
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
	onCompactModeChange
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

	const mergedComponents: CalendarProps<WorklogCalendarEvent>['components'] = {
		toolbar: CustomToolbar,
		event: WorklogCalendarEventContent,
		...components
	}

	return (
		<div className='flex flex-col h-full'>
			<WorklogCalendarActions
				changesSummary={changesSummary}
				onSave={handleSave}
				onCancel={handleCancel}
				isSaving={isSaving}
				saveError={saveError}
			/>
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
					draggableAccessor={() => true}
				/>
			</div>
		</div>
	)
}
