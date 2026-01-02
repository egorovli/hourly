import type { MetaDescriptor } from 'react-router'
import type { Route } from './+types/legal.customer-support.ts'

import { ExternalLinkIcon, HeadphonesIcon, MailIcon } from 'lucide-react'
import { SiGithub } from '@icons-pack/react-simple-icons'

import { Button } from '~/components/shadcn/ui/button.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '~/components/shadcn/ui/card.tsx'
import { Separator } from '~/components/shadcn/ui/separator.tsx'

const SUPPORT_EMAIL = 'hourly+support@egorov.io'
const GITHUB_URL = 'https://github.com/egorovli/hourly'
const GITHUB_ISSUES_URL = 'https://github.com/egorovli/hourly/issues'

export default function CustomerSupportPage(): React.ReactNode {
	return (
		<article className='prose prose-neutral dark:prose-invert max-w-none'>
			<div className='not-prose mb-8 flex items-center gap-3'>
				<div className='bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg'>
					<HeadphonesIcon className='size-5' />
				</div>
				<div>
					<h1 className='text-2xl font-semibold tracking-tight'>Customer Support</h1>
					<p className='text-muted-foreground text-sm'>We're here to help</p>
				</div>
			</div>

			<p className='text-muted-foreground not-prose mb-8 leading-relaxed'>
				Need assistance with Hourly? Choose the best way to reach us based on your needs.
			</p>

			<div className='not-prose grid gap-4 sm:grid-cols-2'>
				<Card className='transition-shadow hover:shadow-md'>
					<CardHeader className='pb-3'>
						<div className='bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-lg'>
							<MailIcon className='size-5' />
						</div>
						<CardTitle className='text-base'>Email Support</CardTitle>
						<CardDescription>For account issues, questions, or feedback</CardDescription>
					</CardHeader>
					<CardContent>
						<Button
							asChild
							className='w-full'
						>
							<a href={`mailto:${SUPPORT_EMAIL}`}>
								<MailIcon className='mr-2 size-4' />
								{SUPPORT_EMAIL}
							</a>
						</Button>
					</CardContent>
				</Card>

				<Card className='transition-shadow hover:shadow-md'>
					<CardHeader className='pb-3'>
						<div className='mb-2 flex size-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'>
							<SiGithub size={20} />
						</div>
						<CardTitle className='text-base'>GitHub Issues</CardTitle>
						<CardDescription>For bug reports and feature requests</CardDescription>
					</CardHeader>
					<CardContent>
						<Button
							asChild
							variant='outline'
							className='w-full'
						>
							<a
								href={GITHUB_ISSUES_URL}
								target='_blank'
								rel='noopener noreferrer'
							>
								Open an Issue
								<ExternalLinkIcon className='ml-2 size-4' />
							</a>
						</Button>
					</CardContent>
				</Card>
			</div>

			<Separator className='my-8' />

			<section className='not-prose'>
				<h2 className='mb-4 text-lg font-medium'>Response Times</h2>
				<p className='text-muted-foreground mb-4 leading-relaxed'>
					Hourly is an open source project maintained by volunteers. We aim to respond to inquiries
					within 2-3 business days, but response times may vary.
				</p>
				<p className='text-muted-foreground leading-relaxed'>
					For urgent security issues, please email us directly with{' '}
					<strong className='text-foreground'>"SECURITY"</strong> in the subject line.
				</p>
			</section>

			<Separator className='my-8' />

			<section className='not-prose'>
				<h2 className='mb-4 text-lg font-medium'>Self-Service Resources</h2>
				<p className='text-muted-foreground mb-4 leading-relaxed'>
					As an open source project, you can also help yourself by exploring our codebase:
				</p>
				<a
					href={GITHUB_URL}
					target='_blank'
					rel='noopener noreferrer'
					className='text-primary hover:text-primary/80 inline-flex items-center gap-2 text-sm font-medium transition-colors'
				>
					View documentation and source code on GitHub
					<ExternalLinkIcon className='size-4' />
				</a>
			</section>
		</article>
	)
}

export function meta(_args: Route.MetaArgs): MetaDescriptor[] {
	return [
		{ title: 'Customer Support • Hourly' },
		{
			name: 'description',
			content: 'Get help with Hourly. Contact us via email or open a GitHub issue.'
		}
	]
}
