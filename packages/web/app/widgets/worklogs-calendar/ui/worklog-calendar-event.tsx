import type { EventProps } from 'react-big-calendar'
import type { WorklogCalendarEvent } from '~/entities/index.ts'
import { formatDurationFromSeconds } from '~/shared/index.ts'

export function WorklogCalendarEventContent({
	event
}: EventProps<WorklogCalendarEvent>): React.ReactNode {
	return (
		<div className='flex h-full flex-col justify-between py-1.5 text-xs leading-tight'>
			{/* Header: Project & Duration */}
			<div className='flex items-start justify-between gap-1.5 mb-1'>
				<span className='text-[9px] font-semibold uppercase tracking-wider opacity-80 line-clamp-1'>
					{event.resource.projectName}
				</span>
				<span className='text-[9px] font-bold tabular-nums opacity-80 shrink-0'>
					{formatDurationFromSeconds(event.resource.timeSpentSeconds)}
				</span>
			</div>

			{/* Main content: Issue Key & Summary */}
			<div className='flex-1 flex flex-col gap-0.5 min-h-0'>
				<div className='flex items-baseline gap-1.5'>
					<span className='text-[10px] font-bold uppercase tracking-wide shrink-0'>
						{event.resource.issueKey}
					</span>
				</div>
				<p className='text-xs font-medium leading-snug line-clamp-2'>
					{event.resource.issueSummary}
				</p>
			</div>

			{/* Footer: Author */}
			<div className='flex items-center gap-1 text-[9px] font-medium opacity-70 mt-1 pt-2 pb-4'>
				<span className='truncate'>{event.resource.authorName}</span>
			</div>
		</div>
	)
}
