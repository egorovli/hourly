import type { RelevantIssueDebugEntry } from '~/entities/jira-issue/index.ts'
import { formatDateTimeLabel } from '~/shared/index.ts'

export interface RelevantIssueDebugCardProps {
	issue: RelevantIssueDebugEntry
}

export function RelevantIssueDebugCard({ issue }: RelevantIssueDebugCardProps): React.ReactNode {
	return (
		<article className='rounded-md border bg-background px-3 py-2 shadow-sm'>
			<div className='flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
				<span>{issue.key}</span>
				<span>{issue.status}</span>
			</div>
			<p className='text-sm font-medium text-foreground'>{issue.summary}</p>
			<p className='text-xs text-muted-foreground'>{issue.projectName}</p>
			<div className='flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground'>
				<span>{issue.assignee}</span>
				<span>•</span>
				<span>{formatDateTimeLabel(issue.updated ?? issue.created)}</span>
			</div>
		</article>
	)
}
