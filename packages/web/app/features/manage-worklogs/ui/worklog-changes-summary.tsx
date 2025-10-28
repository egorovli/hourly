import type { WorklogChanges } from '~/entities/worklog/index.ts'

export interface WorklogChangesSummaryProps {
	worklogChanges: WorklogChanges
}

export function WorklogChangesSummary({
	worklogChanges
}: WorklogChangesSummaryProps): React.ReactNode {
	if (!worklogChanges.hasChanges) {
		return null
	}

	return (
		<div className='flex flex-col gap-2'>
			<p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
				Pending Changes
			</p>
			<div className='space-y-1 text-xs'>
				{worklogChanges.newEntries.length > 0 && (
					<p className='text-green-600 dark:text-green-400'>
						+ {worklogChanges.newEntries.length} new{' '}
						{worklogChanges.newEntries.length === 1 ? 'entry' : 'entries'}
					</p>
				)}
				{worklogChanges.modifiedEntries.length > 0 && (
					<p className='text-yellow-600 dark:text-yellow-400'>
						~ {worklogChanges.modifiedEntries.length} modified{' '}
						{worklogChanges.modifiedEntries.length === 1 ? 'entry' : 'entries'}
					</p>
				)}
				{worklogChanges.deletedEntries.length > 0 && (
					<p className='text-red-600 dark:text-red-400'>
						- {worklogChanges.deletedEntries.length} deleted{' '}
						{worklogChanges.deletedEntries.length === 1 ? 'entry' : 'entries'}
					</p>
				)}
			</div>

			<details className='text-xs'>
				<summary className='cursor-pointer font-medium'>View detailed changes</summary>
				<div className='mt-2 space-y-2'>
					{worklogChanges.newEntries.map(entry => (
						<div
							key={entry.localId}
							className='rounded border border-green-200 bg-green-50 p-2 dark:border-green-900 dark:bg-green-950'
						>
							<p className='font-semibold text-green-700 dark:text-green-300'>
								NEW: {entry.issueKey}
							</p>
							<p className='text-muted-foreground'>{entry.summary}</p>
						</div>
					))}
					{worklogChanges.modifiedEntries.map(entry => (
						<div
							key={entry.localId}
							className='rounded border border-yellow-200 bg-yellow-50 p-2 dark:border-yellow-900 dark:bg-yellow-950'
						>
							<p className='font-semibold text-yellow-700 dark:text-yellow-300'>
								MODIFIED: {entry.issueKey}
							</p>
							<p className='text-muted-foreground'>{entry.summary}</p>
						</div>
					))}
					{worklogChanges.deletedEntries.map(entry => (
						<div
							key={entry.localId}
							className='rounded border border-red-200 bg-red-50 p-2 dark:border-red-900 dark:bg-red-950'
						>
							<p className='font-semibold text-red-700 dark:text-red-300'>
								DELETED: {entry.issueKey}
							</p>
							<p className='text-muted-foreground'>{entry.summary}</p>
						</div>
					))}
				</div>
			</details>
		</div>
	)
}
