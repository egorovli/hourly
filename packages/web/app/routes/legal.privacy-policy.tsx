import type { MetaDescriptor } from 'react-router'
import type { Route } from './+types/legal.privacy-policy.ts'

import { ExternalLinkIcon, ShieldCheckIcon } from 'lucide-react'

import { Badge } from '~/components/shadcn/ui/badge.tsx'
import { Card, CardContent } from '~/components/shadcn/ui/card.tsx'
import { Separator } from '~/components/shadcn/ui/separator.tsx'

const GITHUB_URL = 'https://github.com/egorovli/hourly'
const LAST_UPDATED = '2026-01-02'

export default function PrivacyPolicyPage(): React.ReactNode {
	return (
		<article className='prose prose-neutral dark:prose-invert max-w-none'>
			<div className='not-prose mb-8 flex items-center gap-3'>
				<div className='bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg'>
					<ShieldCheckIcon className='size-5' />
				</div>
				<div>
					<h1 className='text-2xl font-semibold tracking-tight'>Privacy Policy</h1>
					<p className='text-muted-foreground text-sm'>Last updated: {LAST_UPDATED}</p>
				</div>
			</div>

			<Card className='not-prose mb-8 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30'>
				<CardContent className='flex items-start gap-3 pt-4'>
					<Badge
						variant='outline'
						className='border-green-600 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
					>
						GDPR
					</Badge>
					<p className='text-sm leading-relaxed'>
						<strong>We do not store any personal data.</strong> Hourly processes your data in-memory
						during active sessions and does not persist personal information to any database or
						storage system.
					</p>
				</CardContent>
			</Card>

			<section className='mb-8'>
				<h2 className='mb-4 text-lg font-medium'>What We Do</h2>
				<p className='text-muted-foreground mb-4 leading-relaxed'>
					Hourly is a time tracking automation tool that connects to your Atlassian Jira account via
					OAuth2 to help you log work hours. The application:
				</p>
				<ul className='text-muted-foreground list-inside list-disc space-y-2'>
					<li>Authenticates you through Atlassian's official OAuth2 flow</li>
					<li>Accesses your Jira projects and issues during your session</li>
					<li>Creates worklog entries on your behalf when you explicitly request it</li>
				</ul>
			</section>

			<Separator className='my-8' />

			<section className='mb-8'>
				<h2 className='mb-4 text-lg font-medium'>Data Processing</h2>
				<div className='text-muted-foreground space-y-4 leading-relaxed'>
					<p>
						All data processing occurs in real-time during your authenticated session. We use OAuth2
						access tokens to communicate with Atlassian's API on your behalf.
					</p>
					<p>
						<strong className='text-foreground'>Session tokens</strong> are stored temporarily and
						automatically expire. No personal data, project information, or worklog history is
						retained after your session ends.
					</p>
				</div>
			</section>

			<Separator className='my-8' />

			<section className='mb-8'>
				<h2 className='mb-4 text-lg font-medium'>Third-Party Services</h2>
				<p className='text-muted-foreground leading-relaxed'>
					We integrate with Atlassian services. Your use of those services is governed by{' '}
					<a
						href='https://www.atlassian.com/legal/privacy-policy'
						target='_blank'
						rel='noopener noreferrer'
						className='text-primary hover:underline'
					>
						Atlassian's Privacy Policy
					</a>
					.
				</p>
			</section>

			<Separator className='my-8' />

			<section>
				<h2 className='mb-4 text-lg font-medium'>Open Source Transparency</h2>
				<p className='text-muted-foreground mb-4 leading-relaxed'>
					Hourly is open source software. You can inspect exactly how your data is handled by
					reviewing our source code.
				</p>
				<a
					href={GITHUB_URL}
					target='_blank'
					rel='noopener noreferrer'
					className='text-primary hover:text-primary/80 inline-flex items-center gap-2 text-sm font-medium transition-colors'
				>
					View source code on GitHub
					<ExternalLinkIcon className='size-4' />
				</a>
			</section>
		</article>
	)
}

export function meta(_args: Route.MetaArgs): MetaDescriptor[] {
	return [
		{ title: 'Privacy Policy • Hourly' },
		{
			name: 'description',
			content:
				'Hourly privacy policy. We do not store any personal data under GDPR. Open source and transparent.'
		}
	]
}
