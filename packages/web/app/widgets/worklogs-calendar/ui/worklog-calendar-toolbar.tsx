import type { ToolbarProps, View } from 'react-big-calendar'
import type { CalendarCompactMode } from '~/domain/preferences.ts'

import { Button } from '~/shared/ui/shadcn/ui/button.tsx'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '~/lib/util/index.ts'

const VIEW_LABELS: Partial<Record<View, string>> = {
	month: 'Month',
	week: 'Week',
	work_week: 'Work Week',
	day: 'Day',
	agenda: 'Agenda'
}

export interface WorklogCalendarToolbarProps<TEvent extends object, TResource extends object>
	extends ToolbarProps<TEvent, TResource> {
	compactMode?: CalendarCompactMode
	onCompactModeChange?: (mode: CalendarCompactMode) => void
}

export function WorklogCalendarToolbar<TEvent extends object, TResource extends object>({
	label,
	onNavigate,
	onView,
	view,
	views,
	compactMode = 'standard',
	onCompactModeChange
}: WorklogCalendarToolbarProps<TEvent, TResource>): React.ReactElement {
	const normalizedViews: View[] = Array.isArray(views)
		? views
		: (Object.keys(views) as View[]).filter(viewName => {
				const config = (views as Partial<Record<View, unknown>>)[viewName]
				return config !== false && config !== undefined
			})

	return (
		<header className='rbc-toolbar flex flex-col gap-3 border-b border-border bg-card/70 px-4 py-3'>
			<div className='flex flex-wrap items-center justify-between gap-3 w-full'>
				<div className='flex items-center gap-2'>
					<Button
						type='button'
						size='sm'
						variant='outline'
						onClick={() => onNavigate('TODAY')}
					>
						Today
					</Button>

					<div className='flex items-center overflow-hidden rounded-md border border-border bg-background shadow-sm'>
						<Button
							type='button'
							size='icon'
							variant='ghost'
							onClick={() => onNavigate('PREV')}
							aria-label='Go to previous period'
						>
							<ChevronLeft />
						</Button>
						<Button
							type='button'
							size='icon'
							variant='ghost'
							onClick={() => onNavigate('NEXT')}
							aria-label='Go to next period'
						>
							<ChevronRight />
						</Button>
					</div>
				</div>

				<div className='flex min-w-48 flex-col gap-0.5 text-left sm:text-center'>
					<span className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
						Worklog calendar
					</span>
					<span className='text-lg font-semibold text-foreground'>{label}</span>
				</div>

				<div className='flex flex-wrap items-center justify-end gap-1'>
					{/* {onCompactModeChange && (
						<CalendarCompactModeSelector
							value={compactMode}
							onChange={onCompactModeChange}
						/>
					)} */}
					<div className='flex flex-wrap items-center justify-end gap-1 invisible pointer-events-none'>
						{normalizedViews.map(viewOption => {
							const isActive = view === viewOption
							const viewLabel = VIEW_LABELS[viewOption] ?? viewOption.replace('_', ' ')

							return (
								<Button
									key={viewOption}
									type='button'
									size='sm'
									variant={isActive ? 'default' : 'outline'}
									className={cn(
										'capitalize',
										!isActive && 'bg-background/80 text-foreground hover:bg-muted'
									)}
									aria-pressed={isActive}
									onClick={() => onView(viewOption)}
								>
									{viewLabel}
								</Button>
							)
						})}
					</div>
				</div>
			</div>
		</header>
	)
}
