import { Calendar as ReactBigCalendar } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'

const DragAndDropCalendarInner = withDragAndDrop(ReactBigCalendar)

type Calendar<TE extends object = Event, TR extends object = object> = ReturnType<
	typeof withDragAndDrop<TE, TR>
>

type CalendarProps<TE extends object = Event, TR extends object = object> = React.ComponentProps<
	Calendar<TE, TR>
>

export function DragAndDropCalendar<TE extends object = Event, TR extends object = object>(
	props: CalendarProps<TE, TR>
): React.ReactNode {
	const C = DragAndDropCalendarInner as unknown as Calendar<TE, TR>
	return <C {...props} />
}
