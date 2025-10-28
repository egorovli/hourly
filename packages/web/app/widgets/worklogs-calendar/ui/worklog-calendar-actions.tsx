import type { EventChangesSummary } from '../model/types.ts'

import { AlertCircle, Check, X } from 'lucide-react'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { Button } from '~/shared/ui/shadcn/ui/button.tsx'

export interface WorklogCalendarActionsProps {
	changesSummary: EventChangesSummary
	onSave: () => Promise<void>
	onCancel: () => void
	isSaving: boolean
	saveError: Error | null
}

export function WorklogCalendarActions({
	changesSummary,
	onSave,
	onCancel,
	isSaving,
	saveError
}: WorklogCalendarActionsProps): React.ReactNode {
	// Show error toast when save fails
	useEffect(() => {
		if (saveError) {
			toast.error('Failed to save changes', {
				description: saveError.message,
				action: {
					label: 'Retry',
					onClick: () => onSave()
				}
			})
		}
	}, [saveError, onSave])

	if (!changesSummary.hasChanges) {
		return null
	}

	const handleSave = async () => {
		try {
			await onSave()
			toast.success('Changes saved successfully', {
				description: `Updated ${changesSummary.totalChanges} worklog ${changesSummary.totalChanges === 1 ? 'entry' : 'entries'}`
			})
		} catch {
			// Error is handled by useEffect above
		}
	}

	return (
		<div className='flex items-center gap-3 p-3 border-b bg-muted/30'>
			<div className='flex-1'>
				<p className='text-sm font-medium'>
					{changesSummary.totalChanges} unsaved{' '}
					{changesSummary.totalChanges === 1 ? 'change' : 'changes'}
				</p>
				<p className='text-xs text-muted-foreground'>
					Events have been modified. Save or cancel to continue.
				</p>
				{saveError && (
					<p className='text-xs text-destructive flex items-center gap-1 mt-1'>
						<AlertCircle className='h-3 w-3' />
						{saveError.message}
					</p>
				)}
			</div>
			<div className='flex gap-2'>
				<Button
					size='sm'
					variant='outline'
					onClick={onCancel}
					disabled={isSaving}
				>
					<X className='h-4 w-4' />
					Cancel
				</Button>
				<Button
					size='sm'
					onClick={handleSave}
					disabled={isSaving}
				>
					<Check className='h-4 w-4' />
					{isSaving ? 'Saving...' : 'Save Changes'}
				</Button>
			</div>
		</div>
	)
}
