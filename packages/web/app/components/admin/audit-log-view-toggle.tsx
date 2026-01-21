import type { AuditLogViewMode } from '~/domain/index.ts'

import { LayersIcon, ListIcon } from 'lucide-react'
import { useSearchParams } from 'react-router'

import { Button } from '~/components/shadcn/ui/button.tsx'

export interface AuditLogViewToggleProps {
	mode: AuditLogViewMode
}

export function AuditLogViewToggle({ mode }: AuditLogViewToggleProps): React.ReactNode {
	const [searchParams, setSearchParams] = useSearchParams()

	function setViewMode(newMode: AuditLogViewMode): void {
		const newParams = new URLSearchParams(searchParams)

		if (newMode === 'flat') {
			newParams.delete('view[mode]')
		} else {
			newParams.set('view[mode]', newMode)
		}

		// Reset to page 1 when switching views
		newParams.delete('page[number]')

		setSearchParams(newParams)
	}

	return (
		<div className='flex items-center gap-1 rounded-md border p-1'>
			<Button
				variant={mode === 'flat' ? 'secondary' : 'ghost'}
				size='sm'
				className='h-7 px-2'
				onClick={() => setViewMode('flat')}
				aria-pressed={mode === 'flat'}
				aria-label='View as flat list'
			>
				<ListIcon
					aria-hidden='true'
					className='mr-1.5 size-4'
				/>
				Flat
			</Button>
			<Button
				variant={mode === 'grouped' ? 'secondary' : 'ghost'}
				size='sm'
				className='h-7 px-2'
				onClick={() => setViewMode('grouped')}
				aria-pressed={mode === 'grouped'}
				aria-label='View grouped by correlation'
			>
				<LayersIcon
					aria-hidden='true'
					className='mr-1.5 size-4'
				/>
				Grouped
			</Button>
		</div>
	)
}
