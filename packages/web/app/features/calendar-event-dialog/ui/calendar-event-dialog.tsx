import { SaveIcon, XIcon } from 'lucide-react'
import { Button } from '~/shared/ui/shadcn/ui/button.tsx'
import { Combobox } from '~/shared/ui/shadcn/ui/combobox.tsx'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '~/shared/ui/shadcn/ui/dialog.tsx'
import { Input } from '~/shared/ui/shadcn/ui/input.tsx'
import { Label } from '~/shared/ui/shadcn/ui/label.tsx'
import { useEventForm } from '../model/use-event-form.ts'
import type { EventDialogProps } from '../model/types.ts'

// Mock issues for the combobox - in production this would come from API
const MOCK_ISSUES = [
	{ value: 'PROJ-123', label: 'PROJ-123: Implement user authentication' },
	{ value: 'PROJ-124', label: 'PROJ-124: Fix calendar rendering bug' },
	{ value: 'PROJ-125', label: 'PROJ-125: Add dark mode support' },
	{ value: 'PROJ-126', label: 'PROJ-126: Optimize database queries' },
	{ value: 'PROJ-127', label: 'PROJ-127: Update documentation' }
]

export function CalendarEventDialog({
	open,
	onOpenChange,
	mode,
	event,
	onSave
}: EventDialogProps): React.ReactNode {
	const { formData, updateField, resetForm } = useEventForm(mode, event)

	const handleSave = () => {
		onSave(formData)
		resetForm()
		onOpenChange(false)
	}

	const handleCancel = () => {
		resetForm()
		onOpenChange(false)
	}

	const title = mode === 'create' ? 'Create New Event' : 'Edit Event'
	const description =
		mode === 'create'
			? 'Add a new worklog entry to the calendar.'
			: 'Update the worklog entry details.'

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
		>
			<DialogContent className='sm:max-w-[525px]'>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>

				<div className='grid gap-4 py-4'>
					{/* Issue Selector */}
					<div className='grid gap-2'>
						<Label htmlFor='issue'>Issue</Label>
						<Combobox
							options={MOCK_ISSUES}
							value={formData.issueKey}
							onValueChange={value => updateField('issueKey', value)}
							placeholder='Select an issue...'
							searchPlaceholder='Search issues...'
							emptyText='No issues found.'
						/>
					</div>

					{/* Start Date and Time */}
					<div className='grid grid-cols-2 gap-4'>
						<div className='grid gap-2'>
							<Label htmlFor='startDate'>Start Date</Label>
							<Input
								id='startDate'
								type='date'
								value={formData.startDate}
								onChange={e => updateField('startDate', e.target.value)}
							/>
						</div>
						<div className='grid gap-2'>
							<Label htmlFor='startTime'>Start Time</Label>
							<Input
								id='startTime'
								type='time'
								value={formData.startTime}
								onChange={e => updateField('startTime', e.target.value)}
							/>
						</div>
					</div>

					{/* End Date and Time */}
					<div className='grid grid-cols-2 gap-4'>
						<div className='grid gap-2'>
							<Label htmlFor='endDate'>End Date</Label>
							<Input
								id='endDate'
								type='date'
								value={formData.endDate}
								onChange={e => updateField('endDate', e.target.value)}
							/>
						</div>
						<div className='grid gap-2'>
							<Label htmlFor='endTime'>End Time</Label>
							<Input
								id='endTime'
								type='time'
								value={formData.endTime}
								onChange={e => updateField('endTime', e.target.value)}
							/>
						</div>
					</div>

					{/* Description */}
					<div className='grid gap-2'>
						<Label htmlFor='description'>Description</Label>
						<Input
							id='description'
							placeholder='Optional description...'
							value={formData.description}
							onChange={e => updateField('description', e.target.value)}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant='outline'
						onClick={handleCancel}
					>
						<XIcon className='size-4' />
						Cancel
					</Button>
					<Button onClick={handleSave}>
						<SaveIcon className='size-4' />
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
