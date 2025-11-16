import type { Event } from 'react-big-calendar'

import { Calendar as ReactBigCalendar } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'

// export type CalendarProps<
// 	TE extends object = Event,
// 	TR extends object = object
// > = React.ComponentProps<Calendar<TE, TR>>

type CalendarProps<TE extends object = Event, TR extends object = object> = React.ComponentProps<
	ReturnType<typeof withDragAndDrop<TE, TR>>
>

const DragAndDropCalendarInner = withDragAndDrop(ReactBigCalendar)

export function DragAndDropCalendar<TE extends object = Event, TR extends object = object>(
	props: CalendarProps<TE, TR>
): React.ReactNode {
	const C = DragAndDropCalendarInner as unknown as ReturnType<typeof withDragAndDrop<TE, TR>>
	return <C {...props} />
}
