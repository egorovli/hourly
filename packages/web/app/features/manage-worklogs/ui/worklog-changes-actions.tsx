import { useState, useCallback } from 'react'
import { Save, Undo2 } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '~/shared/ui/shadcn/ui/badge.tsx'
import { Button } from '~/shared/ui/shadcn/ui/button.tsx'
import type { WorklogChanges } from '~/entities/worklog/index.ts'
import type { DateRange } from 'react-day-picker'

import { ConfirmWorklogSaveDialog } from '~/features/confirm-worklog-save/index.ts'
import { useUpdateWorklogEntriesMutation } from '~/features/update-worklog-entries/index.ts'

export interface WorklogChangesActionsProps {
	worklogChanges: WorklogChanges
	dateRange?: DateRange
	onApply: () => void
	onRevert: () => void
}

export function WorklogChangesActions({
	worklogChanges,
	dateRange,
	onApply,
	onRevert
}: WorklogChangesActionsProps): React.ReactNode {
	const [isDialogOpen, setIsDialogOpen] = useState(false)
	const mutation = useUpdateWorklogEntriesMutation()

	const handleSaveClick = useCallback(() => {
		setIsDialogOpen(true)
	}, [])

	const handleConfirmSave = useCallback(async () => {
		try {
			// Build request payload
			const request: {
				newEntries: typeof worklogChanges.newEntries
				modifiedEntries: typeof worklogChanges.modifiedEntries
				deletedEntries: typeof worklogChanges.deletedEntries
				dateRange?: { from: string; to: string }
			} = {
				newEntries: worklogChanges.newEntries,
				modifiedEntries: worklogChanges.modifiedEntries,
				deletedEntries: worklogChanges.deletedEntries
			}

			// Add dateRange if both from and to are available
			if (dateRange?.from && dateRange?.to) {
				const fromDate = dateRange.from instanceof Date ? dateRange.from : new Date(dateRange.from)
				const toDate = dateRange.to instanceof Date ? dateRange.to : new Date(dateRange.to)
				const fromStr = fromDate.toISOString().split('T')[0]
				const toStr = toDate.toISOString().split('T')[0]
				if (fromStr && toStr) {
					request.dateRange = {
						from: fromStr,
						to: toStr
					}
				}
			}

			const result = await mutation.mutateAsync(request)

			// Handle success
			if (result.success) {
				toast.success('Worklog changes saved successfully', {
					description: result.message,
					duration: 5000
				})

				// Show detailed results if there were any failures
				if (result.summary.totalFailed > 0) {
					const failedDetails: string[] = []
					if (result.results.created.failed > 0) {
						failedDetails.push(
							`${result.results.created.failed} creation${result.results.created.failed === 1 ? '' : 's'} failed`
						)
					}
					if (result.results.updated.failed > 0) {
						failedDetails.push(
							`${result.results.updated.failed} update${result.results.updated.failed === 1 ? '' : 's'} failed`
						)
					}
					if (result.results.deleted.failed > 0) {
						failedDetails.push(
							`${result.results.deleted.failed} deletion${result.results.deleted.failed === 1 ? '' : 's'} failed`
						)
					}

					toast.warning('Some changes failed', {
						description: failedDetails.join(', '),
						duration: 8000
					})
				}

				setIsDialogOpen(false)
				onApply()
			} else {
				throw new Error(result.message || 'Failed to save worklog changes')
			}
		} catch (error) {
			toast.error('Failed to save worklog changes', {
				description: error instanceof Error ? error.message : 'An unexpected error occurred',
				duration: 8000
			})
		}
	}, [worklogChanges, dateRange, mutation, onApply])

	if (!worklogChanges.hasChanges) {
		return null
	}

	return (
		<>
			<div className='flex items-center gap-2'>
				<Badge variant='outline'>
					{worklogChanges.changeCount} {worklogChanges.changeCount === 1 ? 'change' : 'changes'}
				</Badge>
				<Button
					size='sm'
					variant='default'
					onClick={handleSaveClick}
					disabled={mutation.isPending}
				>
					<Save className='h-4 w-4' />
					Save Changes
				</Button>
				<Button
					size='sm'
					variant='outline'
					onClick={onRevert}
					disabled={mutation.isPending}
				>
					<Undo2 className='h-4 w-4' />
					Revert
				</Button>
			</div>

			<ConfirmWorklogSaveDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				worklogChanges={worklogChanges}
				isSaving={mutation.isPending}
				onConfirm={handleConfirmSave}
			/>
		</>
	)
}
