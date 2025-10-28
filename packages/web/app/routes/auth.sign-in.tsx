import type { Route } from './+types/auth.sign-in.ts'

import { TimerIcon } from 'lucide-react'
import { Link } from 'react-router'

import { LoginForm } from '~/shared/ui/shadcn/blocks/login-form/index.tsx'
import { getSession } from '~/lib/session/storage.ts'
import { getConnectedProviders } from '~/lib/session/helpers.ts'

export default function SignInPage({ loaderData }: Route.ComponentProps): React.ReactNode {
	return (
		<div className='bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10'>
			<div className='flex w-full max-w-sm flex-col gap-6'>
				<Link
					to='#'
					className='flex items-center gap-2 self-center font-medium'
				>
					<div className='bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md'>
						<TimerIcon className='size-4' />
					</div>
					Hourly
				</Link>
				<LoginForm connectedProviders={loaderData.connectedProviders} />
			</div>
		</div>
	)
}

export async function loader({ request }: Route.LoaderArgs) {
	const session = await getSession(request.headers.get('Cookie'))
	const user = session.data.user
	const connectedProviders = getConnectedProviders(user)

	return {
		connectedProviders
	}
}
