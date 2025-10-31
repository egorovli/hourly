import type { SessionUser } from '~/lib/session/storage.ts'
import type { Route as RootRoute } from '../../../../../+types/root.ts'

import { CalendarIcon, Clock10Icon, ClockIcon, Loader2, Settings, TimerIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useFetcher, useRevalidator, useRouteLoaderData } from 'react-router'

import { Button } from '~/shared/ui/shadcn/ui/button.tsx'
import { Label } from '~/shared/ui/shadcn/ui/label.tsx'
import { Separator } from '~/shared/ui/shadcn/ui/separator.tsx'

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem
} from '~/shared/ui/shadcn/ui/sidebar.tsx'

import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '~/shared/ui/shadcn/ui/dialog.tsx'

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '~/shared/ui/shadcn/ui/select.tsx'

import { InputGroup, InputGroupAddon, InputGroupInput } from '../../ui/input-group.tsx'
import { NavMain } from './main.tsx'
import { NavUser } from './user.tsx'

const data = {
	navMain: [
		{
			title: 'Worklog',
			icon: CalendarIcon,
			items: [
				{
					title: 'Calendar',
					url: '/',
					isActive: true
				}
			]
		}
	]
}

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
	sessionUser?: SessionUser
}

export function AppSidebar({ sessionUser, ...props }: AppSidebarProps) {
	const rootData = useRouteLoaderData<RootRoute.ComponentProps['loaderData']>('root')

	const primary = sessionUser?.atlassian ?? sessionUser?.gitlab
	const user = {
		name: primary?.displayName ?? 'Guest',
		email: primary?.email ?? 'Not connected',
		avatar: primary?.avatarUrl ?? ''
	}

	// Use preferences from root data (which already has defaults merged from server)
	// Enhance timezone on client-side if it's UTC (server default)
	const serverPreferences = rootData?.preferences ?? {}
	const [browserTimezone, setBrowserTimezone] = useState<string | null>(null)

	useEffect(() => {
		// Detect browser timezone on client-side only
		if (typeof window !== 'undefined' && serverPreferences.timezone === 'UTC') {
			try {
				const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
				setBrowserTimezone(tz)
			} catch {
				// Keep UTC if detection fails
			}
		}
	}, [serverPreferences.timezone])

	const preferences = useMemo(() => {
		const timezone = browserTimezone ?? serverPreferences.timezone ?? 'UTC'
		return {
			...serverPreferences,
			timezone
		}
	}, [serverPreferences, browserTimezone])

	const [isOpen, setIsOpen] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const fetcher = useFetcher()
	const revalidator = useRevalidator()

	// Controlled state for form fields
	const [timezone, setTimezone] = useState<string>(preferences.timezone ?? 'UTC')
	const [weekStartsOn, setWeekStartsOn] = useState<string>(
		preferences.weekStartsOn?.toString(10) ?? '1'
	)

	// Update controlled state when preferences change
	useEffect(() => {
		if (preferences.timezone) {
			setTimezone(preferences.timezone)
		}
		if (preferences.weekStartsOn !== undefined) {
			setWeekStartsOn(preferences.weekStartsOn.toString(10))
		}
	}, [preferences.timezone, preferences.weekStartsOn])

	// Build timezone list including browser-detected timezone if not already present
	const timezoneList = useMemo(() => {
		const commonTimezones = [
			'Europe/Moscow',
			'Europe/London',
			'Europe/Warsaw',
			'America/New_York',
			'America/Chicago',
			'America/Los_Angeles',
			'Asia/Tokyo',
			'Asia/Shanghai',
			'Australia/Sydney'
		]

		const currentTimezone = preferences.timezone ?? 'UTC'
		if (currentTimezone && !commonTimezones.includes(currentTimezone)) {
			return [currentTimezone, ...commonTimezones]
		}

		return commonTimezones
	}, [preferences.timezone])

	// Handle minimum 2-second loading animation
	useEffect(() => {
		if (fetcher.state === 'submitting') {
			setIsLoading(true)
			return undefined
		}

		// When submission completes, enforce minimum 2-second loading display
		if (fetcher.state === 'idle' && isLoading) {
			const timeout = setTimeout(() => {
				setIsLoading(false)
				// Close dialog on successful submission (no error)
				if (!fetcher.data || (fetcher.data && !(fetcher.data as { error?: unknown }).error)) {
					setIsOpen(false)
					// Reload root data to get updated preferences
					revalidator.revalidate()
				}
			}, 2000)

			return () => {
				clearTimeout(timeout)
			}
		}

		return undefined
	}, [fetcher.state, fetcher.data, isLoading, revalidator])

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		const formData = new FormData(e.currentTarget)

		// Ensure timezone is included in form data
		if (timezone) {
			formData.set('timezone', timezone)
		}

		// Ensure weekStartsOn is included in form data
		if (weekStartsOn) {
			formData.set('weekStartsOn', weekStartsOn)
		}

		fetcher.submit(formData, {
			method: 'post',
			action: '/preferences'
		})
	}

	return (
		<Sidebar
			variant='inset'
			{...props}
		>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							size='lg'
							asChild
						>
							<Link to='#'>
								<div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg'>
									<TimerIcon className='size-4' />
								</div>
								<div className='grid flex-1 text-left text-sm leading-tight'>
									<span className='truncate font-medium'>Hourly</span>
									<span className='truncate text-xs'>Jira Worklogs</span>
								</div>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={data.navMain} />
			</SidebarContent>
			<SidebarFooter>
				<Dialog
					open={isOpen}
					onOpenChange={open => {
						// Prevent closing dialog while saving
						if (!open && isLoading) {
							return
						}
						setIsOpen(open)
					}}
				>
					<SidebarMenu>
						<SidebarMenuItem>
							<DialogTrigger asChild>
								<SidebarMenuButton size='lg'>
									<Settings className='size-4' />
									Settings
								</SidebarMenuButton>
							</DialogTrigger>
						</SidebarMenuItem>
					</SidebarMenu>

					<DialogContent className='sm:max-w-[500px]'>
						<DialogHeader>
							<DialogTitle>Report Settings</DialogTitle>
							<p className='text-sm text-muted-foreground'>
								Configure your working hours and calendar preferences
							</p>
						</DialogHeader>

						<form
							onSubmit={handleSubmit}
							className='flex flex-col gap-6'
						>
							{/* Calendar Settings */}
							<div className='flex flex-col gap-4'>
								<div>
									<h4 className='text-sm font-medium leading-none mb-3'>Calendar</h4>
								</div>

								<div className='flex flex-col gap-2'>
									<Label htmlFor='timezone'>Timezone</Label>
									<Select
										name='timezone'
										value={timezone}
										onValueChange={setTimezone}
									>
										<SelectTrigger
											id='timezone'
											className='w-full'
										>
											<SelectValue placeholder='Select timezone' />
										</SelectTrigger>
										<SelectContent>
											{timezoneList.map(tz => (
												<SelectItem
													key={tz}
													value={tz}
												>
													{tz.replace(/_/g, ' ')}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<p className='text-xs text-muted-foreground'>
										Display timezone for all calendar events
									</p>
								</div>

								<div className='flex flex-col gap-2'>
									<Label htmlFor='week-starts'>Week starts on</Label>
									<Select
										name='weekStartsOn'
										value={weekStartsOn}
										onValueChange={setWeekStartsOn}
									>
										<SelectTrigger
											id='week-starts'
											className='w-full'
										>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value='1'>Monday</SelectItem>
											<SelectItem value='0'>Sunday</SelectItem>
										</SelectContent>
									</Select>
									<p className='text-xs text-muted-foreground'>
										First day of the week in calendar view
									</p>
								</div>
							</div>

							<Separator />

							{/* Working Hours */}
							<div className='flex flex-col gap-4'>
								<div>
									<h4 className='text-sm font-medium leading-none mb-3'>Working Hours</h4>
								</div>

								<div className='flex flex-col gap-2'>
									<div className='grid grid-cols-2 gap-4'>
										<div className='flex flex-col gap-2'>
											<Label htmlFor='work-start'>Start time</Label>
											<InputGroup>
												<InputGroupInput
													id='work-start'
													name='workingDayStartTime'
													type='time'
													step='60'
													defaultValue={preferences.workingDayStartTime}
													className='font-mono'
													required
												/>
												<InputGroupAddon>
													<Clock10Icon />
												</InputGroupAddon>
											</InputGroup>
										</div>

										<div className='flex flex-col gap-2'>
											<Label htmlFor='work-end'>End time</Label>
											<InputGroup>
												<InputGroupInput
													id='work-end'
													name='workingDayEndTime'
													type='time'
													step='60'
													defaultValue={preferences.workingDayEndTime}
													className='font-mono'
													required
												/>
												<InputGroupAddon>
													<ClockIcon />
												</InputGroupAddon>
											</InputGroup>
										</div>
									</div>
									<p className='text-xs text-muted-foreground'>
										Define your typical working day schedule
									</p>
								</div>

								<div className='flex flex-col gap-2'>
									<Label htmlFor='min-duration'>Minimum duration</Label>
									<div className='flex gap-2'>
										<InputGroup>
											<InputGroupInput
												id='min-duration'
												name='minimumDurationMinutes'
												type='number'
												min='1'
												max='480'
												defaultValue={preferences.minimumDurationMinutes?.toString(10)}
												className='flex-1'
												required
											/>
											<InputGroupAddon>
												<TimerIcon />
											</InputGroupAddon>

											<InputGroupAddon align='inline-end'>minutes</InputGroupAddon>
										</InputGroup>
										{/* <Select
											value={durationUnit}
											onValueChange={(v: 'minutes' | 'seconds') => setDurationUnit(v)}
										>
											<SelectTrigger className='w-[130px]'>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value='minutes'>Minutes</SelectItem>
												<SelectItem value='seconds'>Seconds</SelectItem>
											</SelectContent>
										</Select> */}
									</div>
									<p className='text-xs text-muted-foreground'>
										Minimum time block for calendar entries (1-480 minutes or 1-28800 seconds)
									</p>
								</div>
							</div>

							<DialogFooter className='gap-2'>
								<Button
									type='button'
									variant='outline'
									onClick={() => setIsOpen(false)}
									disabled={isLoading}
									className='w-full sm:w-auto'
								>
									Cancel
								</Button>
								<Button
									type='submit'
									disabled={isLoading}
									className='w-full sm:w-auto'
								>
									{isLoading ? (
										<>
											<Loader2 className='mr-2 h-4 w-4 animate-spin' />
											Saving...
										</>
									) : (
										'Save preferences'
									)}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
				<NavUser
					sessionUser={sessionUser}
					user={user}
				/>
			</SidebarFooter>
		</Sidebar>
	)
}
