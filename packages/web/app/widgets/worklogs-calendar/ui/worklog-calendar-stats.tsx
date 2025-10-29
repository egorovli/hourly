import { useMemo } from 'react'
import { format } from 'date-fns'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import type { WorklogCalendarEvent } from '~/entities/index.ts'

import { formatDurationFromSeconds } from '~/shared/lib/formats/index.ts'
import { Badge } from '~/shared/ui/shadcn/ui/badge.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '~/shared/ui/shadcn/ui/card.tsx'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '~/shared/ui/shadcn/ui/chart.tsx'
import { Separator } from '~/shared/ui/shadcn/ui/separator.tsx'
import { Spinner } from '~/shared/ui/shadcn/ui/spinner.tsx'

import { aggregateWorklogStats } from '../model/worklog-stats.ts'

interface WorklogDataStatus {
	label: string
	isLoading: boolean
	loaded?: number
	total?: number
}

export interface WorklogCalendarStatsProps {
	events: WorklogCalendarEvent[]
	className?: string
	statuses?: WorklogDataStatus[]
}

export function WorklogCalendarStats({
	events,
	className,
	statuses = []
}: WorklogCalendarStatsProps): React.ReactNode {
	const stats = useMemo(() => aggregateWorklogStats(events), [events])
	const hasData = stats.totalEntries > 0

	const topProjects = stats.byProject.slice(0, 5)
	const topIssues = stats.byIssue.slice(0, 5)

	const dayChartData = useMemo(
		() =>
			stats.byDay
				.slice()
				.reverse()
				.map(entry => ({
					key: entry.key,
					label: format(entry.date, 'MMM d'),
					fullLabel: format(entry.date, 'PPP'),
					hours: toHours(entry.totalSeconds),
					entries: entry.entryCount
				})),
		[stats.byDay]
	)

	const authorChartData = useMemo(
		() =>
			stats.byAuthor.map(entry => ({
				key: entry.key,
				label: entry.label,
				hours: toHours(entry.totalSeconds),
				entries: entry.entryCount
			})),
		[stats.byAuthor]
	)

	const activeStatuses = statuses.filter(status => status.isLoading)

	return (
		<Card className={className}>
			<CardHeader className='gap-3'>
				<div>
					<CardTitle className='flex items-center gap-2 text-base sm:text-lg'>
						Worklog Insights
						{activeStatuses.length > 0 ? (
							<Badge
								variant='outline'
								className='gap-1 border-dashed text-[11px] font-medium'
							>
								<Spinner className='size-3' />
								Syncing data…
							</Badge>
						) : null}
					</CardTitle>
					<CardDescription>
						{stats.totalEntries} tracked {stats.totalEntries === 1 ? 'entry' : 'entries'} ·{' '}
						{formatDurationFromSeconds(stats.totalSeconds)} total time
					</CardDescription>
				</div>
				{statuses.length > 0 ? (
					<div className='flex flex-wrap gap-2 text-[11px] text-muted-foreground'>
						{statuses.map(status => (
							<span
								key={status.label}
								className='border-border/60 bg-muted/40 text-muted-foreground flex items-center gap-1 rounded-full border px-2 py-1'
							>
								<span className='font-medium text-foreground'>{status.label}</span>
								{status.total !== undefined ? (
									<span className='font-mono text-[10px] uppercase tracking-wide text-muted-foreground/80'>
										{(status.loaded ?? 0).toLocaleString()}/{status.total?.toLocaleString()}
									</span>
								) : null}
								<span className='flex items-center gap-1'>
									{status.isLoading ? (
										<>
											<span className='size-1.5 rounded-full bg-primary' />
											<span>loading…</span>
										</>
									) : (
										<>
											<span className='size-1.5 rounded-full bg-emerald-500' />
											<span>up to date</span>
										</>
									)}
								</span>
							</span>
						))}
					</div>
				) : null}
			</CardHeader>
			<CardContent className='space-y-6 pb-6'>
				<section className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
					<SummaryTile
						label='Active Projects'
						value={topProjects.length}
						helper='projects with logged time'
					/>
					<SummaryTile
						label='Contributors'
						value={stats.byAuthor.length}
						helper='unique authors'
					/>
					<SummaryTile
						label='Active Days'
						value={stats.byDay.length}
						helper='days with activity'
					/>
					<SummaryTile
						label='Avg per Entry'
						value={formatDurationFromSeconds(Math.round(stats.totalSeconds / stats.totalEntries))}
						helper='average duration'
					/>
				</section>

				<Separator />

				{hasData ? (
					<section className='grid gap-6 lg:grid-cols-[1.35fr_1fr]'>
						<div className='space-y-3'>
							<header className='flex items-center justify-between'>
								<h3 className='text-sm font-semibold'>Work time by day</h3>
								<span className='text-xs text-muted-foreground'>
									Last {dayChartData.length} days
								</span>
							</header>
							<div className='rounded-xl border bg-card/40 p-4'>
								<ChartContainer
									className='aspect-[16/9] min-h-[240px]'
									config={{
										hours: {
											label: 'Hours',
											color: 'hsl(var(--primary))'
										}
									}}
								>
									<AreaChart data={dayChartData}>
										<CartesianGrid
											strokeDasharray='3 3'
											className='fill-muted/10'
										/>
										<XAxis
											dataKey='label'
											tickLine={false}
											axisLine={false}
											dy={8}
											padding={{ left: 10, right: 10 }}
										/>
										<YAxis
											dataKey='hours'
											tickLine={false}
											axisLine={false}
											dx={-8}
											tickFormatter={value => `${value}h`}
											width={48}
										/>
										<ChartTooltip
											cursor={{ strokeDasharray: '3 3' }}
											content={
												<ChartTooltipContent
													indicator='line'
													formatter={(value, _name, item) => (
														<div className='flex w-full items-center justify-between gap-6'>
															<span className='text-muted-foreground'>
																{item?.payload?.fullLabel}
															</span>
															<span className='font-semibold text-foreground'>
																{formatHours(value)} h
															</span>
														</div>
													)}
												/>
											}
										/>
										<Area
											type='monotone'
											dataKey='hours'
											fill='var(--color-hours)'
											stroke='var(--color-hours)'
											fillOpacity={0.25}
										/>
									</AreaChart>
								</ChartContainer>
							</div>
						</div>

						<div className='space-y-3'>
							<header className='flex items-center justify-between'>
								<h3 className='text-sm font-semibold'>Hours by author</h3>
								<span className='text-xs text-muted-foreground'>
									{authorChartData.length} people
								</span>
							</header>
							<div className='rounded-xl border bg-card/40 p-4'>
								<ChartContainer
									className='aspect-[4/5] min-h-[240px]'
									config={{
										hours: {
											label: 'Hours',
											color: 'hsl(var(--secondary))'
										}
									}}
								>
									<BarChart
										data={authorChartData}
										barSize={22}
									>
										<CartesianGrid
											vertical={false}
											strokeDasharray='3 3'
										/>
										<XAxis
											dataKey='label'
											tickLine={false}
											axisLine={false}
											angle={-20}
											dy={10}
											height={48}
										/>
										<YAxis
											tickLine={false}
											axisLine={false}
											width={40}
											tickFormatter={value => `${value}h`}
										/>
										<ChartTooltip
											cursor={{ fill: 'var(--accent)', opacity: 0.1 }}
											content={
												<ChartTooltipContent
													indicator='dashed'
													formatter={(value, name, item) => (
														<div className='flex w-full items-center justify-between gap-6'>
															<span className='text-muted-foreground'>{name}</span>
															<span className='font-semibold text-foreground'>
																{formatHours(value)} h · {item?.payload?.entries} entries
															</span>
														</div>
													)}
												/>
											}
										/>
										<Bar
											dataKey='hours'
											radius={[6, 6, 0, 0]}
											fill='var(--color-hours)'
										/>
									</BarChart>
								</ChartContainer>
							</div>
						</div>
					</section>
				) : (
					<div className='rounded-xl border bg-muted/40 px-4 py-12 text-center text-sm text-muted-foreground'>
						No chart data yet. Start logging time to see trends here.
					</div>
				)}

				<Separator />

				<section className='grid gap-4 md:grid-cols-2'>
					<StatList
						title='By Project'
						emptyText='No project information yet.'
						items={topProjects.map(entry => ({
							key: entry.key,
							label: entry.label,
							primary: formatDurationFromSeconds(entry.totalSeconds),
							secondary: `${entry.entryCount} ${entry.entryCount === 1 ? 'entry' : 'entries'}`,
							meta: entry.meta?.projectName
						}))}
					/>
					<StatList
						title='Top Issues'
						emptyText='Issues are not linked yet.'
						items={topIssues.map(entry => ({
							key: entry.key,
							label: entry.label,
							primary: formatDurationFromSeconds(entry.totalSeconds),
							secondary: `${entry.entryCount} ${entry.entryCount === 1 ? 'entry' : 'entries'}`,
							meta: entry.meta?.summary ? entry.meta.summary : entry.meta?.projectName
						}))}
					/>
				</section>
			</CardContent>
		</Card>
	)
}

function toHours(seconds: number): number {
	return Number((seconds / 3600).toFixed(2))
}

function formatHours(value: unknown): string {
	const numeric =
		typeof value === 'number' ? value : typeof value === 'string' ? Number.parseFloat(value) : 0

	return numeric.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

interface SummaryTileProps {
	label: string
	value: React.ReactNode
	helper: string
}

function SummaryTile({ label, value, helper }: SummaryTileProps): React.ReactNode {
	return (
		<div className='rounded-xl border bg-muted/40 px-4 py-3 shadow-sm'>
			<p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>{label}</p>
			<p className='text-2xl font-semibold text-foreground'>{value}</p>
			<p className='text-xs text-muted-foreground'>{helper}</p>
		</div>
	)
}

interface StatListItem {
	key: string
	label: string
	primary: string
	secondary: string
	meta?: string
}

interface StatListProps {
	title: string
	items: StatListItem[]
	emptyText: string
}

function StatList({ title, items, emptyText }: StatListProps): React.ReactNode {
	return (
		<section className='space-y-3'>
			<header className='flex items-center justify-between'>
				<h3 className='text-sm font-semibold'>{title}</h3>
				<span className='text-xs text-muted-foreground'>Top {items.length}</span>
			</header>
			{items.length === 0 ? (
				<p className='text-xs text-muted-foreground'>{emptyText}</p>
			) : (
				<ul className='space-y-2'>
					{items.map(item => (
						<li
							key={item.key}
							className='border-border/70 bg-background/80 flex items-center justify-between rounded-lg border px-3 py-2 shadow-sm'
						>
							<div className='min-w-0 flex-1 pr-3'>
								<p className='truncate text-sm font-semibold text-foreground'>{item.label}</p>
								<p className='truncate text-xs text-muted-foreground'>{item.secondary}</p>
								{item.meta ? (
									<p className='truncate text-xs text-muted-foreground'>{item.meta}</p>
								) : null}
							</div>
							<span className='text-sm font-mono font-semibold tabular-nums text-foreground'>
								{item.primary}
							</span>
						</li>
					))}
				</ul>
			)}
		</section>
	)
}

export type { WorklogDataStatus }
