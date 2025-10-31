import type { WorklogChanges } from '~/entities/worklog/index.ts'
import { AlertTriangle, Loader2, Plus, Edit, Trash2 } from 'lucide-react'

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '~/shared/ui/shadcn/ui/dialog.tsx'
import { Button } from '~/shared/ui/shadcn/ui/button.tsx'
import { Badge } from '~/shared/ui/shadcn/ui/badge.tsx'
import { ScrollArea } from '~/shared/ui/shadcn/ui/scroll-area.tsx'
import { formatDurationFromSeconds } from '~/shared/index.ts'

export interface ConfirmWorklogSaveDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	worklogChanges: WorklogChanges
	isSaving: boolean
	onConfirm: () => void
}

export function ConfirmWorklogSaveDialog({
	open,
	onOpenChange,
	worklogChanges,
	isSaving,
	onConfirm
}: ConfirmWorklogSaveDialogProps): React.ReactNode {
	const totalChanges =
		worklogChanges.newEntries.length +
		worklogChanges.modifiedEntries.length +
		worklogChanges.deletedEntries.length

	const handleConfirm = () => {
		onConfirm()
	}

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
		>
			<DialogContent className='max-w-2xl'>
				<DialogHeader>
					<div className='flex items-start gap-3'>
						<div className='mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10'>
							<AlertTriangle className='h-5 w-5 text-destructive' />
						</div>
						<div className='flex-1'>
							<DialogTitle className='text-xl'>Confirm Worklog Changes</DialogTitle>
							<DialogDescription className='mt-2 text-base'>
								You are about to save {totalChanges} worklog{' '}
								{totalChanges === 1 ? 'change' : 'changes'} to Jira. This action is permanent and
								cannot be undone.
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className='flex flex-col gap-4'>
					{/* Warning banner */}
					<div className='rounded-lg border border-destructive/50 bg-destructive/10 p-3'>
						<div className='flex items-start gap-2'>
							<AlertTriangle className='mt-0.5 h-4 w-4 shrink-0 text-destructive' />
							<div className='flex-1'>
								<p className='text-sm font-semibold text-destructive'>Permanent Action Warning</p>
								<p className='mt-1 text-xs text-destructive/90'>
									These changes will be permanently saved to your Jira worklogs. Once saved, they
									cannot be automatically reverted. Please review all changes carefully before
									confirming.
								</p>
							</div>
						</div>
					</div>

					{/* Summary */}
					<div className='grid grid-cols-3 gap-3'>
						{worklogChanges.newEntries.length > 0 && (
							<div className='flex flex-col gap-1 rounded-lg border border-green-200 bg-green-50/50 p-3 dark:border-green-900 dark:bg-green-950/30'>
								<div className='flex items-center gap-2'>
									<Plus className='h-4 w-4 text-green-600 dark:text-green-400' />
									<span className='text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-300'>
										New Entries
									</span>
								</div>
								<p className='text-lg font-bold text-green-700 dark:text-green-300'>
									{worklogChanges.newEntries.length}
								</p>
							</div>
						)}
						{worklogChanges.modifiedEntries.length > 0 && (
							<div className='flex flex-col gap-1 rounded-lg border border-yellow-200 bg-yellow-50/50 p-3 dark:border-yellow-900 dark:bg-yellow-950/30'>
								<div className='flex items-center gap-2'>
									<Edit className='h-4 w-4 text-yellow-600 dark:text-yellow-400' />
									<span className='text-xs font-semibold uppercase tracking-wide text-yellow-700 dark:text-yellow-300'>
										Modified
									</span>
								</div>
								<p className='text-lg font-bold text-yellow-700 dark:text-yellow-300'>
									{worklogChanges.modifiedEntries.length}
								</p>
							</div>
						)}
						{worklogChanges.deletedEntries.length > 0 && (
							<div className='flex flex-col gap-1 rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-900 dark:bg-red-950/30'>
								<div className='flex items-center gap-2'>
									<Trash2 className='h-4 w-4 text-red-600 dark:text-red-400' />
									<span className='text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300'>
										Deleted
									</span>
								</div>
								<p className='text-lg font-bold text-red-700 dark:text-red-300'>
									{worklogChanges.deletedEntries.length}
								</p>
							</div>
						)}
					</div>

					{/* Detailed list */}
					<ScrollArea className='max-h-[300px] rounded-lg border'>
						<div className='p-3'>
							<div className='space-y-2'>
								{worklogChanges.newEntries.length > 0 && (
									<div className='space-y-2'>
										<p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
											New Entries ({worklogChanges.newEntries.length})
										</p>
										{worklogChanges.newEntries.map(entry => (
											<div
												key={entry.localId}
												className='flex items-start gap-2 rounded border border-green-200 bg-green-50/50 p-2 dark:border-green-900 dark:bg-green-950/30'
											>
												<Plus className='mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400' />
												<div className='flex-1 min-w-0'>
													<div className='flex items-center gap-2'>
														<Badge
															variant='outline'
															className='text-[10px] font-mono'
														>
															{entry.issueKey}
														</Badge>
														<span className='text-xs font-medium text-foreground'>
															{formatDurationFromSeconds(entry.timeSpentSeconds)}
														</span>
													</div>
													<p className='mt-1 text-xs text-muted-foreground line-clamp-2'>
														{entry.summary || 'No summary'}
													</p>
													<p className='mt-0.5 text-[10px] text-muted-foreground'>
														{new Date(entry.started).toLocaleString()}
													</p>
												</div>
											</div>
										))}
									</div>
								)}

								{worklogChanges.modifiedEntries.length > 0 && (
									<div className='space-y-2'>
										<p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
											Modified Entries ({worklogChanges.modifiedEntries.length})
										</p>
										{worklogChanges.modifiedEntries.map(entry => (
											<div
												key={entry.localId}
												className='flex items-start gap-2 rounded border border-yellow-200 bg-yellow-50/50 p-2 dark:border-yellow-900 dark:bg-yellow-950/30'
											>
												<Edit className='mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-600 dark:text-yellow-400' />
												<div className='flex-1 min-w-0'>
													<div className='flex items-center gap-2'>
														<Badge
															variant='outline'
															className='text-[10px] font-mono'
														>
															{entry.issueKey}
														</Badge>
														<span className='text-xs font-medium text-foreground'>
															{formatDurationFromSeconds(entry.timeSpentSeconds)}
														</span>
													</div>
													<p className='mt-1 text-xs text-muted-foreground line-clamp-2'>
														{entry.summary || 'No summary'}
													</p>
													<p className='mt-0.5 text-[10px] text-muted-foreground'>
														{new Date(entry.started).toLocaleString()}
													</p>
												</div>
											</div>
										))}
									</div>
								)}

								{worklogChanges.deletedEntries.length > 0 && (
									<div className='space-y-2'>
										<p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
											Deleted Entries ({worklogChanges.deletedEntries.length})
										</p>
										{worklogChanges.deletedEntries.map(entry => (
											<div
												key={entry.localId}
												className='flex items-start gap-2 rounded border border-red-200 bg-red-50/50 p-2 dark:border-red-900 dark:bg-red-950/30'
											>
												<Trash2 className='mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400' />
												<div className='flex-1 min-w-0'>
													<div className='flex items-center gap-2'>
														<Badge
															variant='outline'
															className='text-[10px] font-mono'
														>
															{entry.issueKey}
														</Badge>
														<span className='text-xs font-medium text-foreground'>
															{formatDurationFromSeconds(entry.timeSpentSeconds)}
														</span>
													</div>
													<p className='mt-1 text-xs text-muted-foreground line-clamp-2'>
														{entry.summary || 'No summary'}
													</p>
													<p className='mt-0.5 text-[10px] text-muted-foreground'>
														{entry.started
															? new Date(entry.started).toLocaleString()
															: 'Unknown date'}
													</p>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					</ScrollArea>
				</div>

				<DialogFooter className='gap-2 sm:gap-0'>
					<Button
						variant='outline'
						onClick={() => onOpenChange(false)}
						disabled={isSaving}
					>
						Cancel
					</Button>
					<Button
						variant='destructive'
						onClick={handleConfirm}
						disabled={isSaving}
					>
						{isSaving ? (
							<>
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
								Saving...
							</>
						) : (
							<>
								<AlertTriangle className='mr-2 h-4 w-4' />
								Confirm & Save
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
