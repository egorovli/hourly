import type { WorklogChanges } from '~/entities/worklog/index.ts'
import { AlertTriangle, Loader2, Plus, Edit, Trash2, Clock, Check } from 'lucide-react'
import { useRouteLoaderData } from 'react-router'

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
import { Separator } from '~/shared/ui/shadcn/ui/separator.tsx'
import { Card } from '~/shared/ui/shadcn/ui/card.tsx'
import { formatDurationFromSeconds } from '~/shared/index.ts'
import { formatDateTimeWithTimezone } from '~/shared/lib/formats/format-date-time.ts'

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
	const rootData = useRouteLoaderData('root') as { preferences?: { timezone?: string } } | undefined
	const timezone = rootData?.preferences?.timezone ?? 'UTC'

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
			<DialogContent className='max-w-3xl sm:max-w-3xl'>
				<DialogHeader className='space-y-3 pb-2'>
					<div className='flex items-start gap-4'>
						<div className='flex-1 space-y-1'>
							<DialogTitle className='text-2xl font-semibold tracking-tight'>
								Confirm Worklog Changes
							</DialogTitle>
							<DialogDescription className='text-base text-muted-foreground'>
								You are about to save{' '}
								<span className='font-semibold text-foreground'>{totalChanges}</span> worklog{' '}
								{totalChanges === 1 ? 'change' : 'changes'} to Jira. This action is{' '}
								<span className='font-semibold text-foreground'>permanent</span> and cannot be
								undone.
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className='space-y-5'>
					{/* Warning banner */}
					<div className='rounded-lg border border-amber-200/40 bg-amber-50/30 p-4 dark:border-amber-900/30 dark:bg-amber-950/20'>
						<div className='flex items-start gap-3'>
							<AlertTriangle className='mt-0.5 h-5 w-5 shrink-0 text-amber-600/70 dark:text-amber-500/60' />
							<div className='flex-1 space-y-1'>
								<p className='text-sm font-semibold text-foreground'>Permanent Action Warning</p>
								<p className='text-sm leading-relaxed text-muted-foreground'>
									These changes will be permanently saved to your Jira worklogs. Once saved, they
									cannot be automatically reverted. Please review all changes carefully before
									confirming.
								</p>
							</div>
						</div>
					</div>

					{/* Summary - horizontal stat bar */}
					<div className='flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-4'>
						{worklogChanges.newEntries.length > 0 && (
							<div className='flex items-center gap-2'>
								<div className='flex h-7 w-7 items-center justify-center rounded-md bg-primary/10'>
									<Plus className='h-3.5 w-3.5 text-primary' />
								</div>
								<div className='flex flex-col'>
									<span className='text-xs font-medium text-muted-foreground'>New</span>
									<span className='text-base font-semibold text-foreground'>
										{worklogChanges.newEntries.length}
									</span>
								</div>
							</div>
						)}
						{worklogChanges.modifiedEntries.length > 0 && (
							<>
								<Separator
									orientation='vertical'
									className='h-8'
								/>
								<div className='flex items-center gap-2'>
									<div className='flex h-7 w-7 items-center justify-center rounded-md bg-accent/20'>
										<Edit className='h-3.5 w-3.5 text-accent-foreground' />
									</div>
									<div className='flex flex-col'>
										<span className='text-xs font-medium text-muted-foreground'>Modified</span>
										<span className='text-base font-semibold text-foreground'>
											{worklogChanges.modifiedEntries.length}
										</span>
									</div>
								</div>
							</>
						)}
						{worklogChanges.deletedEntries.length > 0 && (
							<>
								<Separator
									orientation='vertical'
									className='h-8'
								/>
								<div className='flex items-center gap-2'>
									<div className='flex h-7 w-7 items-center justify-center rounded-md bg-amber-100/50 dark:bg-amber-900/30'>
										<Trash2 className='h-3.5 w-3.5 text-amber-600/70 dark:text-amber-500/60' />
									</div>
									<div className='flex flex-col'>
										<span className='text-xs font-medium text-muted-foreground'>Deleted</span>
										<span className='text-base font-semibold text-foreground'>
											{worklogChanges.deletedEntries.length}
										</span>
									</div>
								</div>
							</>
						)}
					</div>

					{/* Detailed list */}
					<Card className='overflow-hidden border'>
						<ScrollArea className='h-[320px]'>
							<div className='px-4'>
								<div className='space-y-4'>
									{worklogChanges.newEntries.length > 0 && (
										<div className='space-y-2.5'>
											<div className='flex items-center gap-2'>
												<div className='flex h-5 w-5 items-center justify-center rounded-md bg-primary/10'>
													<Plus className='h-3 w-3 text-primary' />
												</div>
												<h3 className='text-sm font-semibold text-foreground'>
													New Entries ({worklogChanges.newEntries.length})
												</h3>
											</div>
											<Separator />
											<div className='space-y-2'>
												{worklogChanges.newEntries.map(entry => (
													<div
														key={entry.localId}
														className='group flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50'
													>
														<div className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10'>
															<Plus className='h-3 w-3 text-primary' />
														</div>
														<div className='flex-1 min-w-0 space-y-1.5'>
															<div className='flex flex-wrap items-center gap-2'>
																<Badge
																	variant='outline'
																	className='font-mono text-xs'
																>
																	{entry.issueKey}
																</Badge>
																<div className='flex items-center gap-1 text-xs font-medium text-muted-foreground'>
																	<Clock className='h-3 w-3' />
																	{formatDurationFromSeconds(entry.timeSpentSeconds)}
																</div>
															</div>
															<p className='text-sm leading-relaxed text-foreground line-clamp-2'>
																{entry.summary || 'No summary'}
															</p>
															<p className='text-xs text-muted-foreground'>
																{formatDateTimeWithTimezone(entry.started, timezone, {
																	dateStyle: 'medium',
																	timeStyle: 'short'
																})}
															</p>
														</div>
													</div>
												))}
											</div>
										</div>
									)}

									{worklogChanges.modifiedEntries.length > 0 && (
										<div className='space-y-2.5'>
											<div className='flex items-center gap-2'>
												<div className='flex h-5 w-5 items-center justify-center rounded-md bg-accent/20'>
													<Edit className='h-3 w-3 text-accent-foreground' />
												</div>
												<h3 className='text-sm font-semibold text-foreground'>
													Modified Entries ({worklogChanges.modifiedEntries.length})
												</h3>
											</div>
											<Separator />
											<div className='space-y-2'>
												{worklogChanges.modifiedEntries.map(entry => (
													<div
														key={entry.localId}
														className='group flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50'
													>
														<div className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent/20'>
															<Edit className='h-3 w-3 text-accent-foreground' />
														</div>
														<div className='flex-1 min-w-0 space-y-1.5'>
															<div className='flex flex-wrap items-center gap-2'>
																<Badge
																	variant='outline'
																	className='font-mono text-xs'
																>
																	{entry.issueKey}
																</Badge>
																<div className='flex items-center gap-1 text-xs font-medium text-muted-foreground'>
																	<Clock className='h-3 w-3' />
																	{formatDurationFromSeconds(entry.timeSpentSeconds)}
																</div>
															</div>
															<p className='text-sm leading-relaxed text-foreground line-clamp-2'>
																{entry.summary || 'No summary'}
															</p>
															<p className='text-xs text-muted-foreground'>
																{formatDateTimeWithTimezone(entry.started, timezone, {
																	dateStyle: 'medium',
																	timeStyle: 'short'
																})}
															</p>
														</div>
													</div>
												))}
											</div>
										</div>
									)}

									{worklogChanges.deletedEntries.length > 0 && (
										<div className='space-y-2.5'>
											<div className='flex items-center gap-2'>
												<div className='flex h-5 w-5 items-center justify-center rounded-md bg-amber-100/50 dark:bg-amber-900/30'>
													<Trash2 className='h-3 w-3 text-amber-600/70 dark:text-amber-500/60' />
												</div>
												<h3 className='text-sm font-semibold text-foreground'>
													Deleted Entries ({worklogChanges.deletedEntries.length})
												</h3>
											</div>
											<Separator />
											<div className='space-y-2'>
												{worklogChanges.deletedEntries.map(entry => (
													<div
														key={entry.localId}
														className='group flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50'
													>
														<div className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-100/50 dark:bg-amber-900/30'>
															<Trash2 className='h-3 w-3 text-amber-600/70 dark:text-amber-500/60' />
														</div>
														<div className='flex-1 min-w-0 space-y-1.5'>
															<div className='flex flex-wrap items-center gap-2'>
																<Badge
																	variant='outline'
																	className='font-mono text-xs'
																>
																	{entry.issueKey}
																</Badge>
																<div className='flex items-center gap-1 text-xs font-medium text-muted-foreground'>
																	<Clock className='h-3 w-3' />
																	{formatDurationFromSeconds(entry.timeSpentSeconds)}
																</div>
															</div>
															<p className='text-sm leading-relaxed text-foreground line-clamp-2'>
																{entry.summary || 'No summary'}
															</p>
															<p className='text-xs text-muted-foreground'>
																{entry.started
																	? formatDateTimeWithTimezone(entry.started, timezone, {
																			dateStyle: 'medium',
																			timeStyle: 'short'
																		})
																	: 'Unknown date'}
															</p>
														</div>
													</div>
												))}
											</div>
										</div>
									)}
								</div>
							</div>
						</ScrollArea>
					</Card>
				</div>

				<DialogFooter className='gap-2 sm:gap-2'>
					<Button
						variant='outline'
						onClick={() => onOpenChange(false)}
						disabled={isSaving}
						className='sm:min-w-[100px]'
					>
						Cancel
					</Button>
					<Button
						variant='default'
						onClick={handleConfirm}
						disabled={isSaving}
						className='sm:min-w-[140px]'
					>
						{isSaving ? (
							<>
								<Loader2 className='h-4 w-4 animate-spin' />
								Saving...
							</>
						) : (
							<>
								<Check className='h-4 w-4' />
								Confirm & Save
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
