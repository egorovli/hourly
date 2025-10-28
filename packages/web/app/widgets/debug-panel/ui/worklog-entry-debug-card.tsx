import type { WorklogDebugEntry } from '~/entities/worklog/index.ts'
import { formatDateTimeLabel, formatDurationFromSeconds } from '~/shared/index.ts'

export interface WorklogEntryDebugCardProps {
	entry: WorklogDebugEntry
}

export function WorklogEntryDebugCard({ entry }: WorklogEntryDebugCardProps): React.ReactNode {
	return (
		<article className='rounded-md border bg-background px-3 py-2 shadow-sm'>
			<div className='flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
				<span>{entry.issueKey}</span>
				<span>{formatDurationFromSeconds(entry.timeSpentSeconds)}</span>
			</div>
			<p className='text-sm font-medium text-foreground'>{entry.summary}</p>
			<p className='text-xs text-muted-foreground'>{entry.projectName}</p>
			<div className='flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground'>
				<span>{entry.authorName}</span>
				<span>•</span>
				<span>{formatDateTimeLabel(entry.started)}</span>
			</div>
		</article>
	)
}
