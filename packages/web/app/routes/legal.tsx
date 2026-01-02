import { Link, Outlet } from 'react-router'

import { Logo } from '~/components/logo.tsx'
import { Separator } from '~/components/shadcn/ui/separator.tsx'

export default function LegalLayout(): React.ReactNode {
	return (
		<div className='min-h-svh bg-background'>
			<header className='border-b'>
				<div className='mx-auto flex h-14 max-w-3xl items-center justify-between px-6'>
					<Logo />
					<nav className='flex items-center gap-4 text-sm'>
						<Link
							to='/legal/privacy-policy'
							className='text-muted-foreground hover:text-foreground transition-colors'
						>
							Privacy
						</Link>
						<Link
							to='/legal/terms-of-service'
							className='text-muted-foreground hover:text-foreground transition-colors'
						>
							Terms
						</Link>
						<Link
							to='/legal/customer-support'
							className='text-muted-foreground hover:text-foreground transition-colors'
						>
							Support
						</Link>
					</nav>
				</div>
			</header>

			<main className='mx-auto max-w-3xl px-6 py-12'>
				<Outlet />
			</main>

			<footer className='border-t'>
				<div className='mx-auto max-w-3xl px-6 py-6'>
					<Separator className='mb-6' />
					<div className='flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left'>
						<p className='text-muted-foreground text-sm'>
							© {new Date().getFullYear()} Hourly. Open source software.
						</p>
						<a
							href='https://github.com/egorovli/hourly'
							target='_blank'
							rel='noopener noreferrer'
							className='text-muted-foreground hover:text-foreground text-sm transition-colors'
						>
							View source on GitHub →
						</a>
					</div>
				</div>
			</footer>
		</div>
	)
}
