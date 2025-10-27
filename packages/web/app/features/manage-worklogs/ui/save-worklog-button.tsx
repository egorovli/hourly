import { Save } from 'lucide-react'
import { Button } from '~/components/shadcn/ui/button.tsx'

export interface SaveWorklogButtonProps {
	disabled?: boolean
	onClick?: () => void
}

export function SaveWorklogButton({ disabled, onClick }: SaveWorklogButtonProps): React.ReactNode {
	return (
		<Button
			type='button'
			variant='default'
			size='sm'
			disabled={disabled}
			onClick={onClick}
		>
			<Save className='h-4 w-4' />
			Apply Changes (stub)
		</Button>
	)
}
