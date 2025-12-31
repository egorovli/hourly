import { Timer } from 'lucide-react'
import { Link } from 'react-router'

import { cn } from '~/lib/util/index.ts'

interface LogoProps {
	asLink?: boolean
	className?: string
}

function Logo({ asLink = true, className }: LogoProps): React.ReactNode {
	const content = (
		<span className={cn('flex items-center gap-2 font-medium', className)}>
			<span className='bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md'>
				<Timer className='size-4' />
			</span>
			Hourly
		</span>
	)

	if (asLink) {
		return (
			<Link
				to='/'
				className='flex items-center gap-2 font-medium'
			>
				{content}
			</Link>
		)
	}

	return content
}

export { Logo }
