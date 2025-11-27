import type { Route } from './+types/auth.sign-in.ts'
import type { ComponentType, ReactNode, SVGProps } from 'react'
import type { MetaDescriptor } from 'react-router'

import { SiAtlassian, SiGithub, SiGitlab, SiRedmine } from '@icons-pack/react-simple-icons'
import { ArrowRight, Check, CheckCircle2, ChevronDown, Cloud, ShieldCheck } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { Button } from '~/components/shadcn/ui/button.tsx'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/shadcn/ui/popover.tsx'
import { withRequestContext } from '~/lib/mikro-orm/index.ts'
import { createSessionStorage } from '~/lib/session/index.ts'

type ProviderCard = {
	accent: string
	available: boolean
	description: string
	icon: ComponentType<SVGProps<SVGSVGElement>>
	id: string
	name: string
	path?: string
	subtext?: string
}

const heroFeatures = [
	'Automatic time allocation',
	'Multiple data source integration',
	'Smart reconciliation algorithms'
]

const providerCards: ProviderCard[] = [
	{
		accent: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
		available: true,
		description: 'Atlassian Jira Cloud & Server',
		icon: SiAtlassian,
		id: 'atlassian',
		name: 'Jira',
		path: '/auth/atlassian/sign-in'
	},
	{
		accent: 'bg-zinc-50 text-zinc-700 ring-zinc-200',
		available: false,
		description: 'GitHub Issues & Projects',
		icon: SiGithub,
		id: 'github',
		name: 'GitHub',
		subtext: 'Coming soon'
	},
	{
		accent: 'bg-orange-50 text-orange-600 ring-orange-100',
		available: false,
		description: 'GitLab Issues & Time Tracking',
		icon: SiGitlab,
		id: 'gitlab',
		name: 'GitLab',
		path: '/auth/gitlab/sign-in'
	},
	{
		accent: 'bg-sky-50 text-sky-600 ring-sky-100',
		available: false,
		description: 'Azure DevOps Work Items',
		icon: Cloud,
		id: 'azure-devops',
		name: 'Azure DevOps',
		subtext: 'Scheduled'
	},
	{
		accent: 'bg-rose-50 text-rose-600 ring-rose-100',
		available: false,
		description: 'Redmine Time Entries',
		icon: SiRedmine,
		id: 'redmine',
		name: 'Redmine',
		subtext: 'In research'
	}
]

export default function SignInPage(): ReactNode {
	const [searchParams] = useSearchParams()
	const [selectedProviderId, setSelectedProviderId] = useState('atlassian')
	const [isProviderSelectOpen, setProviderSelectOpen] = useState(false)

	const getSignInUrl = useCallback(
		(base: string): string => {
			const keys = ['redirected-from']
			const params = new URLSearchParams()

			for (const key of keys) {
				const value = searchParams.get(key)
				if (value) {
					params.set(key, value)
				}
			}

			const search = params.toString()
			return search.length > 0 ? `${base}?${search}` : base
		},
		[searchParams]
	)

	const selectedProvider = useMemo(
		() => providerCards.find(provider => provider.id === selectedProviderId) ?? providerCards[0],
		[selectedProviderId]
	)

	const selectedProviderUrl =
		selectedProvider?.path && selectedProvider?.available
			? getSignInUrl(selectedProvider.path)
			: undefined

	return (
		<main className='relative isolate min-h-dvh overflow-hidden bg-linear-to-br from-slate-50 via-white to-slate-100'>
			<div className='pointer-events-none absolute inset-0 overflow-hidden'>
				<div className='absolute -left-32 top-16 h-96 w-96 rounded-full bg-indigo-100 blur-3xl' />
				<div className='absolute -bottom-24 right-0 h-112 w-md rounded-full bg-slate-200/60 blur-3xl' />
			</div>

			<div className='relative mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-16 px-6 py-16 lg:flex-row lg:items-center lg:justify-between lg:py-24'>
				{/* Left section - Hero */}
				<section className='flex w-full max-w-xl flex-col gap-12 lg:max-w-2xl'>
					<div className='inline-flex items-center gap-4 rounded-3xl border border-white/80 bg-white/90 px-6 py-5 shadow-lg ring-1 ring-slate-200/60 backdrop-blur'>
						<div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-xl font-bold text-white shadow-md'>
							H
						</div>

						<div className='flex flex-col gap-0.5'>
							<p className='text-base font-bold uppercase tracking-wide text-slate-900'>Hourly</p>
							<p className='text-sm text-slate-600'>Automated Time Tracking</p>
						</div>
					</div>

					<div className='flex flex-col gap-8'>
						<h1 className='text-5xl font-bold leading-tight text-slate-900 sm:text-6xl lg:text-5xl'>
							Reconcile your time automatically
						</h1>

						<p className='text-lg leading-relaxed text-slate-600 sm:text-xl'>
							Connect your worklog service and data sources to automatically generate time entries
							from your activity data. No more manual time tracking.
						</p>
					</div>

					<ul className='flex flex-col gap-5'>
						{heroFeatures.map(feature => (
							<li
								key={feature}
								className='flex items-center gap-4 text-base text-slate-700'
							>
								<span className='rounded-full bg-emerald-100/80 p-1.5 text-emerald-600'>
									<CheckCircle2
										className='h-5 w-5'
										strokeWidth={2.5}
									/>
								</span>
								<span className='font-medium'>{feature}</span>
							</li>
						))}
					</ul>
				</section>

				{/* Right section - Sign in form */}
				<section className='w-full lg:max-w-lg'>
					<div className='flex flex-col gap-6 rounded-2xl border border-white/80 bg-white/95 p-8 shadow-xl ring-1 ring-slate-100/80 backdrop-blur'>
						<div className='flex flex-col gap-2'>
							<h2 className='text-2xl font-bold text-slate-900'>Connect your worklog service</h2>
							<p className='text-sm text-slate-600'>
								Choose a provider to get started with automated time tracking.
							</p>
						</div>

						<div className='flex flex-col gap-6'>
							{/* Provider selection */}
							<div className='flex flex-col gap-2'>
								<label
									htmlFor='provider-select'
									className='text-sm font-medium text-slate-700'
								>
									Worklog provider
								</label>
								<Popover
									open={isProviderSelectOpen}
									onOpenChange={setProviderSelectOpen}
								>
									<PopoverTrigger asChild>
										<button
											id='provider-select'
											type='button'
											className='group flex w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-left shadow-sm transition-all duration-150 hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-indigo-500'
										>
											<div className='flex items-center gap-3'>
												{selectedProvider ? (
													<>
														<div
															className={`flex h-10 w-10 items-center justify-center rounded-lg ring-1 ${selectedProvider.accent}`}
														>
															{selectedProvider.icon ? (
																<selectedProvider.icon className='h-5 w-5' />
															) : null}
														</div>
														<div className='min-w-0 flex-1'>
															<p className='text-sm font-medium text-slate-900'>
																{selectedProvider.name}
															</p>
															<p className='text-xs text-slate-500'>
																{selectedProvider.subtext ?? selectedProvider.description}
															</p>
														</div>
													</>
												) : null}
											</div>
											<ChevronDown className='h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 group-data-[state=open]:rotate-180' />
										</button>
									</PopoverTrigger>
									<PopoverContent className='w-[--radix-popover-trigger-width] border-slate-200 p-1.5 shadow-lg'>
										<div className='flex flex-col gap-0.5'>
											{providerCards.map(provider => {
												const Icon = provider.icon
												const isSelected = selectedProvider?.id === provider.id
												return (
													<button
														key={provider.id}
														type='button'
														disabled={!provider.available}
														onClick={() => {
															if (!provider.available) {
																return
															}
															setSelectedProviderId(provider.id)
															setProviderSelectOpen(false)
														}}
														className='flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent'
													>
														<div className='flex items-center gap-3'>
															<div
																className={`flex h-9 w-9 items-center justify-center rounded-lg ring-1 ${provider.accent}`}
															>
																<Icon className='h-4 w-4' />
															</div>
															<div className='text-left'>
																<p className='text-sm font-medium text-slate-900'>
																	{provider.name}
																</p>
																<p className='text-xs text-slate-500'>
																	{provider.subtext ?? provider.description}
																</p>
															</div>
														</div>
														{isSelected ? (
															<Check className='h-4 w-4 shrink-0 text-indigo-600' />
														) : null}
													</button>
												)
											})}
										</div>
									</PopoverContent>
								</Popover>
							</div>

							{/* Continue button */}
							{selectedProviderUrl ? (
								<Button
									asChild
									className='group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-indigo-500 hover:shadow-md'
								>
									<Link to={selectedProviderUrl}>
										<span>Continue</span>
										<ArrowRight className='h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5' />
									</Link>
								</Button>
							) : (
								<Button
									className='flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold'
									disabled
								>
									<span>Continue</span>
									<ArrowRight className='h-4 w-4' />
								</Button>
							)}
						</div>

						{/* Security info */}
						<div className='rounded-xl border border-blue-100 bg-blue-50/60 p-4'>
							<div className='flex items-start gap-3'>
								<span className='rounded-lg bg-white/80 p-2 text-blue-600'>
									<ShieldCheck className='h-4 w-4' />
								</span>

								<div className='flex min-w-0 flex-1 flex-col gap-1'>
									<p className='text-sm font-semibold text-blue-900'>
										Secure OAuth2 Authentication
									</p>
									<p className='text-xs leading-relaxed text-blue-800/80'>
										We use industry-standard OAuth2 to securely connect to your worklog service. No
										passwords.
									</p>
								</div>
							</div>
						</div>

						{/* Footer */}
						<div className='flex flex-col gap-3 text-center text-sm'>
							<p className='flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-slate-600'>
								<span>Don't see your provider?</span>
								<a
									className='font-semibold text-indigo-600 transition-colors hover:text-indigo-500'
									href='mailto:hello@hourly.app'
								>
									Contact support
								</a>
								<span>to request integration.</span>
							</p>

							<p className='text-xs text-slate-400'>Privacy Policy · Terms of Service · Support</p>
						</div>
					</div>
				</section>
			</div>
		</main>
	)
}

export const loader = withRequestContext(async function loader({ request }: Route.LoaderArgs) {
	const sessionStorage = createSessionStorage()
	await sessionStorage.getSession(request.headers.get('Cookie'))

	return {}
})

export function meta(args: Route.MetaArgs): MetaDescriptor[] {
	const title = 'Sign In • Hourly'

	const description =
		'Connect your worklog service and data sources to automatically generate time entries from your activity data. No more manual time tracking. Secure OAuth2 authentication with Atlassian Jira, GitLab, and more.'

	const keywords =
		'sign in, login, authentication, OAuth, Jira, GitLab, time tracking, worklog, automated time tracking, connect account'

	return [
		{ title },
		{ name: 'description', content: description },
		{ name: 'keywords', content: keywords },

		// Open Graph tags
		{ property: 'og:type', content: 'website' },
		{ property: 'og:title', content: title },
		{ property: 'og:description', content: description },
		// { property: 'og:url', content: `${baseUrl}${pathname}` },

		// Twitter Card tags
		{ name: 'twitter:card', content: 'summary_large_image' },
		{ name: 'twitter:title', content: title },
		{ name: 'twitter:description', content: description }
	]
}
