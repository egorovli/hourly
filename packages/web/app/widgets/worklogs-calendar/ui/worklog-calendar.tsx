import type {
	CalendarProps,
	DayPropGetter,
	EventPropGetter,
	SlotPropGetter,
	View
} from 'react-big-calendar'
import { DragAndDropCalendar } from '~/lib/calendar/drag-and-drop-calendar.client.tsx'
import type { WorklogCalendarEvent } from '~/entities/index.ts'
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
	slotPropGetter
}: WorklogsCalendarProps): React.ReactNode {
	const mergedComponents: CalendarProps<WorklogCalendarEvent>['components'] = {
		toolbar: WorklogCalendarToolbar,
		event: WorklogCalendarEventContent,
		...components
	}

	return (
		<DragAndDropCalendar
			className='worklog-calendar'
			date={date}
			defaultView={view}
			events={events}
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
			eventPropGetter={eventPropGetter}
			dayPropGetter={dayPropGetter}
			slotPropGetter={slotPropGetter}
			showMultiDayTimes
			min={min}
			max={max}
			tooltipAccessor={event => event.title}
			// use default dnd handlers for now
			resizable
			draggableAccessor={() => true}
		/>
	)
}
