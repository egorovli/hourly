import { Loader2 } from 'lucide-react'

import { Button } from '~/components/shadcn/ui/button.tsx'
import { Input } from '~/components/shadcn/ui/input.tsx'
import { DataTableDateRangeFilter } from '~/components/data-table-date-range-filter.tsx'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '~/components/shadcn/ui/select.tsx'

interface ReportSettingsState {
	workDayStart: string
	workDayEnd: string
	timezone: string
	weekStartsOn: number
	minimumDuration: string // hours as string: '0.5' | '1' | '2' | '4'
}

interface ReportSettingsToolbarProps {
	settings: ReportSettingsState
	onChange: (next: ReportSettingsState) => void
	dateRange?: { from: Date | undefined; to: Date | undefined }
	onDateRangeChange?: (range: { from: Date | undefined; to: Date | undefined }) => void
	fetcherState?: 'idle' | 'submitting' | 'loading'
	onReset?: () => void
}

const TIMEZONES = [
	'Europe/Moscow',
	'Europe/London',
	'America/New_York',
	'America/Los_Angeles',
	'Asia/Tokyo',
	'Asia/Shanghai',
	'Australia/Sydney'
]

export function ReportSettingsToolbar({
	settings,
	onChange,
	dateRange,
	onDateRangeChange,
	fetcherState = 'idle',
	onReset
}: ReportSettingsToolbarProps) {
	const isBusy = fetcherState !== 'idle'

	return (
		<div className='flex items-start justify-start flex-wrap gap-2'>
			{dateRange && onDateRangeChange && (
				<DataTableDateRangeFilter
					dateRange={dateRange}
					onSelect={onDateRangeChange}
				/>
			)}

			<Select
				value={settings.timezone}
				onValueChange={tz => onChange({ ...settings, timezone: tz })}
			>
				<SelectTrigger
					id='timezone'
					className='h-8 w-[200px]'
				>
					<SelectValue placeholder='Timezone' />
				</SelectTrigger>
				<SelectContent>
					{TIMEZONES.map(tz => (
						<SelectItem
							key={tz}
							value={tz}
						>
							{tz.replace(/_/g, ' ')}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<Select
				value={String(settings.weekStartsOn)}
				onValueChange={v => onChange({ ...settings, weekStartsOn: Number(v) })}
			>
				<SelectTrigger
					id='week-starts-on'
					className='h-8 w-[140px]'
				>
					<SelectValue placeholder='Week' />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='1'>Monday</SelectItem>
					<SelectItem value='0'>Sunday</SelectItem>
				</SelectContent>
			</Select>

			<Input
				id='work-start'
				type='time'
				value={settings.workDayStart}
				onChange={e => onChange({ ...settings, workDayStart: e.target.value })}
				className='h-8 w-[120px] font-mono'
				placeholder='Start'
			/>

			<Input
				id='work-end'
				type='time'
				value={settings.workDayEnd}
				onChange={e => onChange({ ...settings, workDayEnd: e.target.value })}
				className='h-8 w-[120px] font-mono'
				placeholder='End'
			/>

			<Select
				value={settings.minimumDuration}
				onValueChange={v => onChange({ ...settings, minimumDuration: v })}
			>
				<SelectTrigger
					id='min-duration'
					className='h-8 w-[160px]'
				>
					<SelectValue placeholder='Min' />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='0.5'>30 minutes</SelectItem>
					<SelectItem value='1'>1 hour</SelectItem>
					<SelectItem value='2'>2 hours</SelectItem>
					<SelectItem value='4'>4 hours</SelectItem>
				</SelectContent>
			</Select>

			<div className='ml-auto flex items-center gap-2'>
				<Button
					variant='outline'
					type='button'
					onClick={onReset}
					disabled={isBusy}
					className='h-8'
				>
					Reset
				</Button>
				<Button
					type='submit'
					disabled={isBusy}
					className='h-8'
				>
					{isBusy && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
					Apply
				</Button>
			</div>
		</div>
	)
}

export type { ReportSettingsToolbarProps, ReportSettingsState }
