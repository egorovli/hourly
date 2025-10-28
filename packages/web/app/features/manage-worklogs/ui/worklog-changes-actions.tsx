import { Save, Undo2 } from 'lucide-react'
import { Badge } from '~/components/shadcn/ui/badge.tsx'
import { Button } from '~/components/shadcn/ui/button.tsx'
import type { WorklogChanges } from '~/entities/worklog/index.ts'

export interface WorklogChangesActionsProps {
	worklogChanges: WorklogChanges
	onApply: () => void
	onRevert: () => void
}

export function WorklogChangesActions({
	worklogChanges,
	onApply,
	onRevert
}: WorklogChangesActionsProps): React.ReactNode {
	if (!worklogChanges.hasChanges) {
		return null
	}

	return (
		<div className='flex items-center gap-2'>
			<Badge variant='outline'>
				{worklogChanges.changeCount} {worklogChanges.changeCount === 1 ? 'change' : 'changes'}
			</Badge>
			<Button
				size='sm'
				variant='default'
				onClick={onApply}
			>
				<Save className='h-4 w-4' />
				Apply Changes
			</Button>
			<Button
				size='sm'
				variant='outline'
				onClick={onRevert}
			>
				<Undo2 className='h-4 w-4' />
				Revert
			</Button>
		</div>
	)
}
