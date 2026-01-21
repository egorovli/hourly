import { Link } from 'react-router'
import { HomeIcon, ShieldXIcon } from 'lucide-react'

import { Button } from '~/components/shadcn/ui/button.tsx'

export function AdminForbidden(): React.ReactNode {
	return (
		<div className='flex min-h-screen flex-col items-center justify-center gap-6 p-4'>
			<div className='flex flex-col items-center gap-4 text-center'>
				<div className='flex size-16 items-center justify-center rounded-full bg-destructive/10'>
					<ShieldXIcon className='size-8 text-destructive' />
				</div>

				<div className='space-y-2'>
					<h1 className='text-2xl font-bold tracking-tight'>Access Denied</h1>
					<p className='max-w-md text-muted-foreground'>
						You do not have permission to access the admin panel. Contact an administrator if you
						believe this is an error.
					</p>
				</div>
			</div>

			<Button
				asChild
				variant='outline'
			>
				<Link to='/'>
					<HomeIcon className='mr-2 size-4' />
					Return to Home
				</Link>
			</Button>
		</div>
	)
}
