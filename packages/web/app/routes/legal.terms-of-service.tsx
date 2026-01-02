import type { MetaDescriptor } from 'react-router'
import type { Route } from './+types/legal.terms-of-service.ts'

import { ExternalLinkIcon, FileTextIcon } from 'lucide-react'

import { Badge } from '~/components/shadcn/ui/badge.tsx'
import { Card, CardContent } from '~/components/shadcn/ui/card.tsx'
import { Separator } from '~/components/shadcn/ui/separator.tsx'

const GITHUB_URL = 'https://github.com/egorovli/hourly'
const LAST_UPDATED = '2026-01-02'

export default function TermsOfServicePage(): React.ReactNode {
	return (
		<article className='prose prose-neutral dark:prose-invert max-w-none'>
			<div className='not-prose mb-8 flex items-center gap-3'>
				<div className='bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg'>
					<FileTextIcon className='size-5' />
				</div>
				<div>
					<h1 className='text-2xl font-semibold tracking-tight'>Terms of Service</h1>
					<p className='text-muted-foreground text-sm'>Last updated: {LAST_UPDATED}</p>
				</div>
			</div>

			<Card className='not-prose mb-8 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30'>
				<CardContent className='flex items-start gap-3 pt-4'>
					<Badge
						variant='outline'
						className='border-blue-600 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
					>
						Free
					</Badge>
					<p className='text-sm leading-relaxed'>
						<strong>Hourly is free, open source software</strong> provided as-is without warranty.
						You are free to use, modify, and distribute it under the terms of its license.
					</p>
				</CardContent>
			</Card>

			<section className='mb-8'>
				<h2 className='mb-4 text-lg font-medium'>Acceptance of Terms</h2>
				<p className='text-muted-foreground leading-relaxed'>
					By accessing or using Hourly, you agree to be bound by these Terms of Service. If you do
					not agree, please do not use the service.
				</p>
			</section>

			<Separator className='my-8' />

			<section className='mb-8'>
				<h2 className='mb-4 text-lg font-medium'>Service Description</h2>
				<p className='text-muted-foreground mb-4 leading-relaxed'>
					Hourly is a time tracking automation tool that integrates with Atlassian Jira via OAuth2.
					The service allows you to:
				</p>
				<ul className='text-muted-foreground list-inside list-disc space-y-2'>
					<li>Connect your Atlassian account securely</li>
					<li>View your Jira projects and issues</li>
					<li>Create and manage worklog entries</li>
				</ul>
			</section>

			<Separator className='my-8' />

			<section className='mb-8'>
				<h2 className='mb-4 text-lg font-medium'>Your Responsibilities</h2>
				<div className='text-muted-foreground space-y-4 leading-relaxed'>
					<p>You are responsible for:</p>
					<ul className='list-inside list-disc space-y-2'>
						<li>Maintaining the security of your Atlassian account credentials</li>
						<li>All activities that occur under your account</li>
						<li>Ensuring your use complies with Atlassian's terms of service</li>
						<li>The accuracy of worklog entries you create</li>
					</ul>
				</div>
			</section>

			<Separator className='my-8' />

			<section className='mb-8'>
				<h2 className='mb-4 text-lg font-medium'>Disclaimer of Warranties</h2>
				<p className='text-muted-foreground leading-relaxed'>
					Hourly is provided <strong className='text-foreground'>"as is"</strong> without warranties
					of any kind, express or implied. We do not guarantee that the service will be
					uninterrupted, secure, or error-free.
				</p>
			</section>

			<Separator className='my-8' />

			<section className='mb-8'>
				<h2 className='mb-4 text-lg font-medium'>Limitation of Liability</h2>
				<p className='text-muted-foreground leading-relaxed'>
					To the maximum extent permitted by law, the authors and contributors of Hourly shall not
					be liable for any direct, indirect, incidental, special, or consequential damages arising
					from your use of the service.
				</p>
			</section>

			<Separator className='my-8' />

			<section>
				<h2 className='mb-4 text-lg font-medium'>Open Source</h2>
				<p className='text-muted-foreground mb-4 leading-relaxed'>
					Hourly is open source software. You can review the source code and contribute to its
					development on GitHub.
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
		{ title: 'Terms of Service • Hourly' },
		{
			name: 'description',
			content:
				'Hourly terms of service. Free, open source time tracking automation software provided as-is.'
		}
	]
}
