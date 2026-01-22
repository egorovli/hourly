import { useSearchParams } from 'react-router'

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '~/components/shadcn/ui/select.tsx'
import { ACTIVITY_THRESHOLD_OPTIONS, DEFAULT_ACTIVITY_THRESHOLD_MS } from '~/domain/index.ts'

export interface AuditLogThresholdSelectProps {
	threshold: number
}

export function AuditLogThresholdSelect({
	threshold
}: AuditLogThresholdSelectProps): React.ReactNode {
	const [searchParams, setSearchParams] = useSearchParams()

	function handleThresholdChange(value: string): void {
		const newParams = new URLSearchParams(searchParams)
		const numValue = Number(value)

		if (numValue === DEFAULT_ACTIVITY_THRESHOLD_MS) {
			newParams.delete('view[threshold]')
		} else {
			newParams.set('view[threshold]', value)
		}

		// Reset to page 1 when threshold changes
		newParams.delete('page[number]')

		setSearchParams(newParams)
	}

	return (
		<div className='flex items-center gap-2'>
			<span className='text-sm text-muted-foreground'>Group within</span>
			<Select
				value={threshold.toString()}
				onValueChange={handleThresholdChange}
			>
				<SelectTrigger className='h-9 w-[140px]'>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{ACTIVITY_THRESHOLD_OPTIONS.map(option => (
						<SelectItem
							key={option.value}
							value={option.value.toString()}
						>
							<span>{option.label}</span>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	)
}
