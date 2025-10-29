import type { CSSProperties } from 'react'
import { useMemo } from 'react'
import { format } from 'date-fns'
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'

import type { WorklogCalendarEvent } from '~/entities/index.ts'

import { generateColorFromString } from '~/shared/index.ts'
import { formatDurationFromSeconds } from '~/shared/lib/formats/index.ts'
import { Badge } from '~/shared/ui/shadcn/ui/badge.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '~/shared/ui/shadcn/ui/card.tsx'
import type { ChartConfig } from '~/shared/ui/shadcn/ui/chart.tsx'
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent
} from '~/shared/ui/shadcn/ui/chart.tsx'
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

	const insights = useMemo(() => buildInsightsData(events), [events])

	const authorChartConfig = useMemo(() => {
		const config: ChartConfig = {}
		for (const series of insights.authorSeries) {
			config[series.dataKey] = { label: series.label, color: series.color }
		}
		return config
	}, [insights.authorSeries])

	const projectChartConfig = useMemo(() => {
		const config: ChartConfig = {}
		for (const series of insights.projectSeries) {
			config[series.dataKey] = { label: series.label, color: series.color }
		}
		return config
	}, [insights.projectSeries])

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
					<section className='grid gap-6 lg:grid-cols-[1.45fr_1fr]'>
						<div className='space-y-6'>
							<div className='space-y-3'>
								<header className='flex items-center justify-between'>
									<h3 className='text-sm font-semibold'>Daily distribution</h3>
									<span className='text-xs text-muted-foreground'>
										Last {insights.dailyByAuthor.length} days
									</span>
								</header>
								<div className='rounded-xl border bg-card/40 p-4'>
									<ChartContainer
										className='aspect-[16/9] min-h-[260px]'
										config={authorChartConfig}
									>
										<BarChart data={insights.dailyByAuthor}>
											<CartesianGrid
												vertical={false}
												strokeDasharray='3 3'
											/>
											<XAxis
												dataKey='label'
												tickLine={false}
												axisLine={false}
												dy={8}
												padding={{ left: 12, right: 12 }}
											/>
											<YAxis
												tickLine={false}
												axisLine={false}
												width={48}
												dx={-8}
												tickFormatter={value => `${value}h`}
											/>
											<ChartTooltip
												cursor={false}
												content={
													<ChartTooltipContent
														className='w-[220px]'
														labelFormatter={(_, payload) => {
															const point = payload?.[0]?.payload as DailySeriesPoint | undefined
															return point?.fullLabel ?? ''
														}}
														formatter={(value, key, item) => {
															const point = item?.payload as DailySeriesPoint | undefined
															const numeric =
																typeof value === 'number'
																	? value
																	: typeof value === 'string'
																		? Number.parseFloat(value)
																		: 0
															const label =
																authorChartConfig[key as keyof typeof authorChartConfig]?.label ??
																key
															const order = point?.__seriesOrder ?? []
															const isLast = order[order.length - 1] === key
															return (
																<>
																	<div
																		className='h-2.5 w-2.5 shrink-0 rounded-[2px]'
																		style={
																			{
																				'--color-bg': `var(--color-${key})`
																			} as CSSProperties
																		}
																	/>
																	{label}
																	<div className='text-foreground ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums'>
																		{formatHours(numeric)}
																		<span className='text-muted-foreground font-normal'>h</span>
																	</div>
																	{isLast ? (
																		<div className='text-foreground mt-1.5 flex basis-full items-center border-t pt-1.5 text-xs font-medium'>
																			Total
																			<div className='text-foreground ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums'>
																				{formatHours(point?.totalHours ?? 0)}
																				<span className='text-muted-foreground font-normal'>h</span>
																			</div>
																			<span className='ml-3 text-muted-foreground font-normal'>
																				{point?.entryCount ?? 0}{' '}
																				{point?.entryCount === 1 ? 'entry' : 'entries'}
																			</span>
																		</div>
																	) : null}
																</>
															)
														}}
													/>
												}
											/>
											{insights.authorSeries.map(series => (
												<Bar
													key={series.dataKey}
													dataKey={series.dataKey}
													stackId='daily'
													fill={`var(--color-${series.dataKey})`}
													radius={[4, 4, 0, 0]}
													maxBarSize={36}
												/>
											))}
											<ChartLegend content={<ChartLegendContent />} />
										</BarChart>
									</ChartContainer>
								</div>
							</div>
							{insights.projectDailyCharts.length > 0 ? (
								<div className='space-y-3'>
									<header className='flex items-center justify-between'>
										<h3 className='text-sm font-semibold'>Daily by project</h3>
										<span className='text-xs text-muted-foreground'>
											{insights.projectDailyCharts.length}{' '}
											{insights.projectDailyCharts.length === 1 ? 'project' : 'projects'}
										</span>
									</header>
									<div className='grid gap-4 md:grid-cols-2'>
										{insights.projectDailyCharts.map(project => (
											<div
												key={project.key}
												className='rounded-xl border bg-card/40 p-4'
											>
												<div className='mb-2 flex items-center justify-between text-xs text-muted-foreground'>
													<span className='text-sm font-semibold text-foreground'>
														{project.label}
													</span>
													<span className='font-mono font-medium text-foreground'>
														{formatHours(project.totalHours)} h
													</span>
												</div>
												<ChartContainer
													className='aspect-[4/3] min-h-[200px]'
													config={authorChartConfig}
												>
													<BarChart data={project.data}>
														<CartesianGrid
															vertical={false}
															strokeDasharray='3 3'
														/>
														<XAxis
															dataKey='label'
															tickLine={false}
															axisLine={false}
															dy={8}
															padding={{ left: 8, right: 8 }}
														/>
														<YAxis
															tickLine={false}
															axisLine={false}
															width={40}
															dx={-6}
															tickFormatter={value => `${value}h`}
														/>
														<ChartTooltip
															cursor={false}
															content={
																<ChartTooltipContent
																	className='w-[200px]'
																	labelFormatter={(_, payload) => {
																		const point = payload?.[0]?.payload as
																			| DailySeriesPoint
																			| undefined
																		return point?.fullLabel ?? ''
																	}}
																	formatter={(value, key) => {
																		const numeric =
																			typeof value === 'number'
																				? value
																				: typeof value === 'string'
																					? Number.parseFloat(value)
																					: 0
																		const label =
																			authorChartConfig[key as keyof typeof authorChartConfig]
																				?.label ?? key
																		return (
																			<>
																				<div
																					className='h-2.5 w-2.5 shrink-0 rounded-[2px]'
																					style={
																						{
																							'--color-bg': `var(--color-${key})`
																						} as CSSProperties
																					}
																				/>
																				{label}
																				<div className='text-foreground ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums'>
																					{formatHours(numeric)}
																					<span className='text-muted-foreground font-normal'>
																						h
																					</span>
																				</div>
																			</>
																		)
																	}}
																/>
															}
														/>
														{project.series.map(series => (
															<Bar
																key={`${project.key}-${series.dataKey}`}
																dataKey={series.dataKey}
																stackId={project.key}
																fill={`var(--color-${series.dataKey})`}
																radius={[4, 4, 0, 0]}
																maxBarSize={28}
															/>
														))}
													</BarChart>
												</ChartContainer>
											</div>
										))}
									</div>
								</div>
							) : null}
						</div>
						<div className='space-y-3'>
							<header className='flex items-center justify-between'>
								<h3 className='text-sm font-semibold'>User contributions</h3>
								<span className='text-xs text-muted-foreground'>
									{insights.authorTotals.length}{' '}
									{insights.authorTotals.length === 1 ? 'person' : 'people'}
								</span>
							</header>
							<div className='rounded-xl border bg-card/40 p-4'>
								<ChartContainer
									className='min-h-[260px]'
									config={{
										...projectChartConfig,
										label: { color: 'var(--background)' }
									}}
								>
									<BarChart
										data={insights.authorTotals}
										layout='vertical'
										barCategoryGap={12}
									>
										<CartesianGrid
											horizontal={false}
											strokeDasharray='3 3'
										/>
										<XAxis
											type='number'
											tickLine={false}
											axisLine={false}
											domain={[0, 'dataMax']}
											tickFormatter={value => `${value}h`}
										/>
										<YAxis
											type='category'
											dataKey='author'
											tickLine={false}
											axisLine={false}
											width={110}
										/>
										<ChartTooltip
											cursor={false}
											content={
												<ChartTooltipContent
													className='w-[220px]'
													labelFormatter={value => value}
													formatter={(value, key, item) => {
														const numeric =
															typeof value === 'number'
																? value
																: typeof value === 'string'
																	? Number.parseFloat(value)
																	: 0
														const label =
															projectChartConfig[key as keyof typeof projectChartConfig]?.label ??
															key
														const point = item?.payload as AuthorTotalsPoint | undefined
														const order = point?.__projectOrder ?? []
														const isLast = order[order.length - 1] === key
														return (
															<>
																<div
																	className='h-2.5 w-2.5 shrink-0 rounded-[2px]'
																	style={
																		{
																			'--color-bg': `var(--color-${key})`
																		} as CSSProperties
																	}
																/>
																{label}
																<div className='text-foreground ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums'>
																	{formatHours(numeric)}
																	<span className='text-muted-foreground font-normal'>h</span>
																</div>
																{isLast ? (
																	<div className='text-foreground mt-1.5 flex basis-full items-center border-t pt-1.5 text-xs font-medium'>
																		Total
																		<div className='text-foreground ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums'>
																			{formatHours(point?.totalHours ?? 0)}
																			<span className='text-muted-foreground font-normal'>h</span>
																		</div>
																		<span className='ml-3 text-muted-foreground font-normal'>
																			{point?.entryCount ?? 0}{' '}
																			{point?.entryCount === 1 ? 'entry' : 'entries'}
																		</span>
																	</div>
																) : null}
															</>
														)
													}}
												/>
											}
										/>
										{insights.projectSeries.map((series, index) => (
											<Bar
												key={series.dataKey}
												dataKey={series.dataKey}
												stackId='author-total'
												fill={`var(--color-${series.dataKey})`}
												radius={
													index === insights.projectSeries.length - 1 ? [0, 4, 4, 0] : undefined
												}
											>
												{index === 0 ? (
													<>
														<LabelList
															dataKey='author'
															position='insideLeft'
															offset={12}
															className='fill-(--color-label) text-xs font-medium'
														/>
														<LabelList
															dataKey='totalHours'
															position='right'
															offset={8}
															className='fill-foreground text-xs font-medium'
															formatter={(value: unknown) => `${formatHours(value)} h`}
														/>
													</>
												) : null}
											</Bar>
										))}
										<ChartLegend content={<ChartLegendContent />} />
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
							meta: entry.meta?.['projectName']
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
							meta: entry.meta?.['summary'] ? entry.meta?.['summary'] : entry.meta?.['projectName']
						}))}
					/>
				</section>
			</CardContent>
		</Card>
	)
}

interface AuthorSeries {
	rawKey: string
	dataKey: string
	label: string
	color: string
}

interface AuthorSeriesAccumulator extends AuthorSeries {
	totalSeconds: number
}

interface ProjectSeries {
	rawKey: string
	dataKey: string
	label: string
	color: string
}

interface ProjectSeriesAccumulator extends ProjectSeries {
	totalSeconds: number
}

type DailySeriesPoint = Record<string, number | string | string[]> & {
	key: string
	label: string
	fullLabel: string
	totalHours: number
	entryCount: number
	__seriesOrder: string[]
}

type AuthorTotalsPoint = Record<string, number | string | string[]> & {
	key: string
	author: string
	totalHours: number
	entryCount: number
	__projectOrder: string[]
}

interface ProjectDailyChart {
	key: string
	label: string
	totalHours: number
	data: DailySeriesPoint[]
	series: AuthorSeries[]
}

interface InsightsData {
	authorSeries: AuthorSeries[]
	projectSeries: ProjectSeries[]
	dailyByAuthor: DailySeriesPoint[]
	projectDailyCharts: ProjectDailyChart[]
	authorTotals: AuthorTotalsPoint[]
}

interface DayAccumulator {
	key: string
	date: Date
	totalSeconds: number
	entryCount: number
	values: Map<string, number>
}

interface ProjectAccumulator {
	key: string
	label: string
	dataKey: string
	totalSeconds: number
	dayMap: Map<string, DayAccumulator>
	authorSeconds: Map<string, number>
}

interface AuthorTotalAccumulator {
	key: string
	label: string
	totalSeconds: number
	entryCount: number
	projectSeconds: Map<string, number>
}

const UNASSIGNED_PROJECT_LABEL = 'Unassigned'
const UNKNOWN_AUTHOR_KEY = 'unknown-author'
const UNKNOWN_AUTHOR_LABEL = 'Unknown'

function buildInsightsData(events: WorklogCalendarEvent[]): InsightsData {
	if (events.length === 0) {
		return {
			authorSeries: [],
			projectSeries: [],
			dailyByAuthor: [],
			projectDailyCharts: [],
			authorTotals: []
		}
	}

	const authorSeriesMap = new Map<string, AuthorSeriesAccumulator>()
	const projectSeriesMap = new Map<string, ProjectSeriesAccumulator>()
	const dayMap = new Map<string, DayAccumulator>()
	const projectMap = new Map<string, ProjectAccumulator>()
	const authorTotalsMap = new Map<string, AuthorTotalAccumulator>()

	for (const event of events) {
		const durationSeconds = normalizeDurationSeconds(event.resource.timeSpentSeconds)
		if (durationSeconds === 0) {
			continue
		}

		const startDate = getEventStartDate(event)
		if (!startDate) {
			continue
		}

		const dayKey = startDate.toISOString().slice(0, 10)
		const dayEntry = ensureDayAccumulator(dayMap, dayKey, startDate)
		dayEntry.totalSeconds += durationSeconds
		dayEntry.entryCount += 1

		const authorKeyRaw =
			(event.resource.authorAccountId || event.resource.authorName || '').trim() ||
			UNKNOWN_AUTHOR_KEY
		const authorLabel = event.resource.authorName?.trim() || UNKNOWN_AUTHOR_LABEL
		const authorSeries = ensureAuthorSeries(authorSeriesMap, authorKeyRaw, authorLabel)
		authorSeries.totalSeconds += durationSeconds
		const authorDataKey = authorSeries.dataKey
		dayEntry.values.set(authorDataKey, (dayEntry.values.get(authorDataKey) ?? 0) + durationSeconds)

		const projectIdentity = resolveProjectIdentifiers(event)
		const projectSeries = ensureProjectSeries(projectSeriesMap, projectIdentity)
		projectSeries.totalSeconds += durationSeconds
		const projectEntry = ensureProjectAccumulator(projectMap, projectSeries)
		projectEntry.totalSeconds += durationSeconds

		const projectDayEntry = ensureDayAccumulator(projectEntry.dayMap, dayKey, startDate)
		projectDayEntry.totalSeconds += durationSeconds
		projectDayEntry.entryCount += 1
		projectDayEntry.values.set(
			authorDataKey,
			(projectDayEntry.values.get(authorDataKey) ?? 0) + durationSeconds
		)
		projectEntry.authorSeconds.set(
			authorDataKey,
			(projectEntry.authorSeconds.get(authorDataKey) ?? 0) + durationSeconds
		)

		const authorTotals = ensureAuthorTotals(authorTotalsMap, authorSeries)
		authorTotals.totalSeconds += durationSeconds
		authorTotals.entryCount += 1
		authorTotals.projectSeconds.set(
			projectSeries.dataKey,
			(authorTotals.projectSeconds.get(projectSeries.dataKey) ?? 0) + durationSeconds
		)
	}

	const authorSeries = Array.from(authorSeriesMap.values())
		.sort((a, b) => b.totalSeconds - a.totalSeconds)
		.map(({ totalSeconds: _total, ...series }) => series)

	const authorSeriesByDataKey = new Map(authorSeries.map(series => [series.dataKey, series]))

	const dailyByAuthor = Array.from(dayMap.values())
		.sort((a, b) => a.date.getTime() - b.date.getTime())
		.map(day => buildDailySeriesPoint(day, authorSeries))

	const projectSeries = Array.from(projectSeriesMap.values())
		.sort((a, b) => b.totalSeconds - a.totalSeconds)
		.map(({ totalSeconds: _total, ...series }) => series)

	const projectDailyCharts = Array.from(projectMap.values())
		.map(project => {
			const data = Array.from(project.dayMap.values())
				.sort((a, b) => a.date.getTime() - b.date.getTime())
				.map(day => buildDailySeriesPoint(day, authorSeries))

			const activeSeries = Array.from(project.authorSeconds.entries())
				.sort((a, b) => b[1] - a[1])
				.map(([dataKey]) => authorSeriesByDataKey.get(dataKey))
				.filter((series): series is AuthorSeries => Boolean(series))
				.slice(0, 6)

			return {
				key: project.key,
				label: project.label,
				data,
				totalHours: toHours(project.totalSeconds),
				series: activeSeries.length > 0 ? activeSeries : authorSeries.slice(0, 1)
			}
		})
		.sort((a, b) => b.totalHours - a.totalHours)

	const authorTotals = Array.from(authorTotalsMap.values())
		.sort((a, b) => b.totalSeconds - a.totalSeconds)
		.map(entry => {
			const row: AuthorTotalsPoint = {
				key: entry.key,
				author: entry.label,
				totalHours: toHours(entry.totalSeconds),
				entryCount: entry.entryCount,
				__projectOrder: []
			}

			const order: string[] = []
			for (const series of projectSeries) {
				const seconds = entry.projectSeconds.get(series.dataKey) ?? 0
				const hours = toHours(seconds)
				row[series.dataKey] = hours
				if (seconds > 0) {
					order.push(series.dataKey)
				}
			}
			row.__projectOrder = order

			return row
		})

	return {
		authorSeries,
		projectSeries,
		dailyByAuthor,
		projectDailyCharts,
		authorTotals
	}
}

function ensureAuthorSeries(
	map: Map<string, AuthorSeriesAccumulator>,
	rawKey: string,
	label: string
): AuthorSeriesAccumulator {
	const normalizedKey = rawKey || UNKNOWN_AUTHOR_KEY
	const existing = map.get(normalizedKey)
	if (existing) {
		return existing
	}

	const chartKey = createChartKey('author', normalizedKey)
	const colors = generateColorFromString(label)
	const series: AuthorSeriesAccumulator = {
		rawKey: normalizedKey,
		dataKey: chartKey,
		label,
		color: colors.backgroundColor,
		totalSeconds: 0
	}
	map.set(normalizedKey, series)
	return series
}

function ensureProjectSeries(
	map: Map<string, ProjectSeriesAccumulator>,
	identity: { key: string; label: string }
): ProjectSeriesAccumulator {
	const normalizedKey = identity.key || UNASSIGNED_PROJECT_LABEL
	const existing = map.get(normalizedKey)
	if (existing) {
		return existing
	}

	const chartKey = createChartKey('project', normalizedKey)
	const colors = generateColorFromString(identity.label)
	const series: ProjectSeriesAccumulator = {
		rawKey: normalizedKey,
		dataKey: chartKey,
		label: identity.label,
		color: colors.backgroundColor,
		totalSeconds: 0
	}
	map.set(normalizedKey, series)
	return series
}

function ensureProjectAccumulator(
	map: Map<string, ProjectAccumulator>,
	series: ProjectSeriesAccumulator
): ProjectAccumulator {
	const existing = map.get(series.rawKey)
	if (existing) {
		return existing
	}

	const entry: ProjectAccumulator = {
		key: series.rawKey,
		label: series.label,
		dataKey: series.dataKey,
		totalSeconds: 0,
		dayMap: new Map(),
		authorSeconds: new Map()
	}
	map.set(series.rawKey, entry)
	return entry
}

function ensureAuthorTotals(
	map: Map<string, AuthorTotalAccumulator>,
	authorSeries: AuthorSeriesAccumulator
): AuthorTotalAccumulator {
	const existing = map.get(authorSeries.rawKey)
	if (existing) {
		return existing
	}

	const entry: AuthorTotalAccumulator = {
		key: authorSeries.rawKey,
		label: authorSeries.label,
		totalSeconds: 0,
		entryCount: 0,
		projectSeconds: new Map()
	}
	map.set(authorSeries.rawKey, entry)
	return entry
}

function ensureDayAccumulator(
	map: Map<string, DayAccumulator>,
	key: string,
	date: Date
): DayAccumulator {
	const existing = map.get(key)
	if (existing) {
		return existing
	}

	const entry: DayAccumulator = {
		key,
		date: new Date(date),
		totalSeconds: 0,
		entryCount: 0,
		values: new Map()
	}
	map.set(key, entry)
	return entry
}

function buildDailySeriesPoint(
	day: DayAccumulator,
	authorSeries: AuthorSeries[]
): DailySeriesPoint {
	const point: DailySeriesPoint = {
		key: day.key,
		label: format(day.date, 'MMM d'),
		fullLabel: format(day.date, 'PPP'),
		totalHours: toHours(day.totalSeconds),
		entryCount: day.entryCount,
		__seriesOrder: []
	}

	const order: string[] = []
	for (const series of authorSeries) {
		const seconds = day.values.get(series.dataKey) ?? 0
		point[series.dataKey] = toHours(seconds)
		if (seconds > 0) {
			order.push(series.dataKey)
		}
	}
	point.__seriesOrder = order

	return point
}

function createChartKey(prefix: string, rawKey: string): string {
	const safe = rawKey
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.toLowerCase()
	return `${prefix}-${safe || 'unknown'}`
}

function resolveProjectIdentifiers(event: WorklogCalendarEvent): { key: string; label: string } {
	const projectName = event.resource.projectName?.trim() ?? ''
	if (projectName) {
		return { key: projectName, label: projectName }
	}

	const issueKey = event.resource.issueKey?.trim() ?? ''
	if (issueKey.includes('-')) {
		const derivedKey = issueKey.split('-')[0] ?? UNASSIGNED_PROJECT_LABEL
		return { key: derivedKey, label: derivedKey }
	}

	return { key: UNASSIGNED_PROJECT_LABEL, label: UNASSIGNED_PROJECT_LABEL }
}

function normalizeDurationSeconds(value: number | undefined): number {
	if (!value || Number.isNaN(value) || value <= 0) {
		return 0
	}

	return Math.floor(value)
}

function getEventStartDate(event: WorklogCalendarEvent): Date | null {
	const start = event.start
	if (start instanceof Date) {
		return Number.isNaN(start.getTime()) ? null : start
	}

	const parsed = new Date(start)
	return Number.isNaN(parsed.getTime()) ? null : parsed
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
