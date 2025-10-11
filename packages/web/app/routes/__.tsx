import type { Route } from './+types/__.ts'
import type { loader as rootLoader } from '~/root.tsx'

import { Outlet, useRouteLoaderData } from 'react-router'

import { Header } from '~/components/header/index.tsx'
import { Footer } from '~/components/footer/index.tsx'
// import { authenticator } from '~/lib/auth/index.server.ts'
import { sessionStorage } from '~/lib/session/storage.ts'

export default function CommonLayout(): React.ReactNode {
	const root = useRouteLoaderData('root') as Awaited<ReturnType<typeof rootLoader>> | undefined
	void root

	return (
		<div className='min-h-screen flex flex-col'>
			<Header />

			<main className='grow'>
				<Outlet />
			</main>

			<Footer />
		</div>
	)
}

export async function loader({ request }: Route.LoaderArgs) {
	const session = await sessionStorage.getSession(request.headers.get('Cookie'))
	console.log('User from session:', session.get('user'))

	return {}
}
