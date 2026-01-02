import type { MetaDescriptor } from 'react-router'
import type { Route } from './+types/auth.sign-in.ts'

import {
	SiAtlassian,
	SiAtlassianHex,
	SiGithub,
	SiGithubHex,
	SiGitlab,
	SiGitlabHex
} from '@icons-pack/react-simple-icons'

import { Link } from 'react-router'
import { useState } from 'react'

import { Logo } from '~/components/logo.tsx'
import { Button } from '~/components/shadcn/ui/button.tsx'
import { Label } from '~/components/shadcn/ui/label.tsx'
import { withRequestContext } from '~/lib/mikro-orm/index.ts'
import { invariant } from '~/lib/util/invariant.ts'

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '~/components/shadcn/ui/select.tsx'

interface Provider {
	id: string
	name: string
	description: string
	icon: React.ElementType
	color: string
	disabled: boolean
}

const providers: Provider[] = [
	{
		id: 'atlassian',
		name: 'Atlassian',
		description: 'Jira & Confluence',
		icon: SiAtlassian,
		color: SiAtlassianHex,
		disabled: false
	},
	{
		id: 'gitlab',
		name: 'GitLab',
		description: 'Coming soon',
		icon: SiGitlab,
		color: SiGitlabHex,
		disabled: true
	},
	{
		id: 'github',
		name: 'GitHub',
		description: 'Coming soon',
		icon: SiGithub,
		color: SiGithubHex,
		disabled: true
	}
]

export default function SignInPage(): React.ReactNode {
	const [providerId, setProviderId] = useState<string>('atlassian')

	const provider = providers.find(p => p.id === providerId) ?? providers[0]
	invariant(provider, 'Provider not found')

	const Icon = provider.icon

	return (
		<div className='grid min-h-svh lg:grid-cols-2'>
			<div className='flex flex-col gap-4 p-6 md:p-10'>
				<div className='flex justify-center gap-2 md:justify-start'>
					<Logo />
				</div>
				<div className='flex flex-1 items-center justify-center'>
					<div className='w-full max-w-xs'>
						<div className='flex flex-col gap-6'>
							<div className='flex flex-col items-center gap-2 text-center'>
								<h1 className='text-2xl font-bold'>Login to your account</h1>
								<p className='text-muted-foreground text-sm text-balance'>
									Select your worklog service provider to start tracking time automatically
								</p>
							</div>

							<div className='grid gap-4'>
								<div className='grid gap-2'>
									<Label htmlFor='provider-select'>Provider</Label>
									<Select
										value={providerId}
										onValueChange={setProviderId}
									>
										<SelectTrigger
											id='provider-select'
											className='w-full'
										>
											<SelectValue>
												<span className='flex items-center gap-2'>
													<Icon
														size={16}
														color={provider.color}
													/>
													{provider.name}
												</span>
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											{providers.map(p => {
												const Icon = p.icon

												return (
													<SelectItem
														key={p.id}
														value={p.id}
														disabled={p.disabled}
													>
														<span className='flex items-center gap-2'>
															<Icon
																size={16}
																color={p.color}
															/>
															<span className='flex flex-col'>
																<span>{p.name}</span>
																<span className='text-muted-foreground text-xs'>
																	{p.description}
																</span>
															</span>
														</span>
													</SelectItem>
												)
											})}
										</SelectContent>
									</Select>
								</div>

								<Button
									asChild
									className='w-full'
								>
									<Link to={`/auth/${providerId}/sign-in`}>Continue</Link>
								</Button>
							</div>

							<p className='text-muted-foreground text-center text-xs text-balance'>
								By continuing, you agree to our{' '}
								<Link
									to='/legal/terms-of-service'
									className='text-primary hover:underline'
								>
									Terms of Service
								</Link>{' '}
								and{' '}
								<Link
									to='/legal/privacy-policy'
									className='text-primary hover:underline'
								>
									Privacy Policy
								</Link>
							</p>
						</div>
					</div>
				</div>
			</div>
			<div className='bg-muted relative hidden lg:block'>
				<picture>
					<source
						media='(min-width: 1536px)'
						srcSet='
							https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=1200&h=1600&q=80&crop=entropy 1x,
							https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=2400&h=3200&q=80&crop=entropy 2x
						'
					/>
					<source
						media='(min-width: 1280px)'
						srcSet='
							https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=800&h=1200&q=80&crop=entropy 1x,
							https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=1600&h=2400&q=80&crop=entropy 2x
						'
					/>
					<img
						src='https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=600&h=900&q=80&crop=entropy'
						srcSet='
							https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=600&h=900&q=80&crop=entropy 1x,
							https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=1200&h=1800&q=80&crop=entropy 2x
						'
						alt='Minimalist workspace with notebook and coffee'
						className='absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale'
					/>
				</picture>
			</div>
		</div>
	)
}

export const loader = withRequestContext(async function loader({
	request,
	...args
}: Route.LoaderArgs) {
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
