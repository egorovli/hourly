import type { GitlabCommitDebugEntry } from '~/entities/gitlab-commit/index.ts'
import { formatDateTimeLabel } from '~/shared/index.ts'

export interface GitlabCommitDebugCardProps {
	commit: GitlabCommitDebugEntry
}

export function GitlabCommitDebugCard({ commit }: GitlabCommitDebugCardProps): React.ReactNode {
	return (
		<article className='rounded-md border bg-background px-3 py-2 shadow-sm'>
			<div className='flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
				<span>{commit.shortId}</span>
				<span>{formatDateTimeLabel(commit.createdAt)}</span>
			</div>
			<p className='text-sm font-medium text-foreground'>{commit.title}</p>
			<p className='text-xs text-muted-foreground'>{commit.projectName}</p>
			<div className='flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground'>
				<span>{commit.authorLabel}</span>
				{commit.issueKeys.length > 0 ? (
					<>
						<span>•</span>
						<span>{commit.issueKeys.join(', ')}</span>
					</>
				) : null}
			</div>
		</article>
	)
}
