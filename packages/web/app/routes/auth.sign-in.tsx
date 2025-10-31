import type { Route } from './+types/auth.sign-in.ts'

import { TimerIcon } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { LoginForm } from '~/shared/ui/shadcn/blocks/login-form/index.tsx'
import { Toaster } from '~/shared/ui/shadcn/ui/sonner.tsx'
import { getSession } from '~/lib/session/storage.ts'
import { getConnectedProviders } from '~/lib/session/helpers.ts'

export default function SignInPage({ loaderData }: Route.ComponentProps): React.ReactNode {
	const navigate = useNavigate()

	// Display flash error if present and clear it from URL
	useEffect(() => {
		if (loaderData.error) {
			const errorInfo = loaderData.error
			const isDev = import.meta.env.DEV

			// Build description with details in dev mode
			let description = errorInfo.description
			if (isDev && errorInfo.details) {
				description = `${errorInfo.description}\n\nDetails: ${errorInfo.details}`
			}

			toast.error(errorInfo.title, {
				description,
				duration: isDev ? 10000 : 5000 // Longer duration in dev mode
			})
			// Clear error from URL after displaying
			navigate('/auth/sign-in', { replace: true })
		}
	}, [loaderData.error, navigate])

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
			<Toaster />
		</div>
	)
}

export async function loader({ request }: Route.LoaderArgs) {
	const session = await getSession(request.headers.get('Cookie'))
	const user = session.data.user
	const connectedProviders = getConnectedProviders(user)

	// Read error from URL search params (more reliable than flash data)
	const url = new URL(request.url)
	const errorParam = url.searchParams.get('error')

	let error: { title: string; description: string; details?: string } | undefined

	if (errorParam) {
		try {
			// Try to parse as JSON (new format)
			const parsed = JSON.parse(decodeURIComponent(errorParam)) as unknown
			if (
				typeof parsed === 'object' &&
				parsed !== null &&
				'title' in parsed &&
				'description' in parsed &&
				typeof (parsed as { title: unknown }).title === 'string' &&
				typeof (parsed as { description: unknown }).description === 'string'
			) {
				const typedParsed = parsed as { title: string; description: string; details?: string }
				error = {
					title: typedParsed.title,
					description: typedParsed.description,
					details: typeof typedParsed.details === 'string' ? typedParsed.details : undefined
				}
			} else {
				// Invalid format, fallback to plain string
				error = {
					title: 'Authentication Error',
					description: decodeURIComponent(errorParam)
				}
			}
		} catch {
			// Fallback to plain string (backward compatibility)
			error = {
				title: 'Authentication Error',
				description: decodeURIComponent(errorParam)
			}
		}
	}

	// Debug: log to see if error is being read
	if (import.meta.env.DEV) {
		console.log('[auth.sign-in] Error from URL:', error)
	}

	return {
		connectedProviders,
		error
	}
}
