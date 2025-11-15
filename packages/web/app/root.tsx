/** biome-ignore-all lint/style/noProcessEnv: We pass env from process.env via loader */
/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: We need to pass env to the client */

import type { Route } from './+types/root.ts'
import type { Preferences } from '~/domain/preferences.ts'

import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useRouteError,
	useRouteLoaderData
} from 'react-router'

import * as cookies from '~/lib/cookies/index.ts'
import { cn } from '~/lib/util/index.ts'
import { DragProvider } from '~/contexts/drag-context.tsx'

import 'temporal-polyfill/global'
// import 'react-big-calendar/lib/css/react-big-calendar.css'
// import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import '~/styles/global.css'
// import '~/styles/fonts/inter.css'

export const links: Route.LinksFunction = () => []
export const meta: Route.MetaFunction = () => []

interface LayoutProps {
	children: React.ReactNode
}

export function Layout({ children }: LayoutProps): React.ReactNode {
	const data = useRouteLoaderData<typeof loader>('root')
	const error = useRouteError()

	void error

	return (
		<html
			lang={data?.locale ?? data?.preferences?.locale ?? 'en'}
			className={cn(
				'min-h-screen bg-background text-foreground',
				data?.preferences?.theme === 'light' && 'light',
				data?.preferences?.theme === 'dark' && 'dark'
			)}
		>
			<head>
				<meta charSet='utf-8' />
				<meta
					name='viewport'
					content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
				/>

				{/* Theme Color: Sets the color of the browser's address bar on supported mobile browsers (mostly Android Chrome). */}
				<meta
					name='theme-color'
					content='#f0f6fe'
				/>

				{/* Apple Mobile Web App Capable: Makes your website run as a standalone app when saved to the home screen on iOS. */}
				<meta
					name='apple-mobile-web-app-capable'
					content='yes'
				/>

				{/* Apple Status Bar Style: Changes the color style of the iOS status bar when your site is launched as a web app. */}
				{/* Possible values: default, black, black-translucent */}
				<meta
					name='apple-mobile-web-app-status-bar-style'
					content='black-translucent'
				/>

				<Meta />
				<Links />

				{data?.env && (
					<script
						dangerouslySetInnerHTML={{
							__html: `
								window.env = ${JSON.stringify(data.env)};
							`
						}}
					/>
				)}
			</head>
			<body className='min-h-screen'>
				{children}

				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	)
}

export default function App({ loaderData }: Route.ComponentProps): React.ReactNode {
	return (
		<DragProvider>
			<div className='flex h-screen flex-col overflow-hidden'>
				<Outlet />
			</div>
		</DragProvider>
	)
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps): React.ReactNode {
	let message = 'Oops!'
	let details = 'An unexpected error occurred.'
	let stack: string | undefined

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? '404' : 'Error'
		details =
			error.status === 404 ? 'The requested page could not be found.' : error.statusText || details
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message
		stack = error.stack
	}

	return (
		<main>
			<h1>{message}</h1>
			<p>{details}</p>

			{stack ? (
				<pre>
					<code>{stack}</code>
				</pre>
			) : null}
		</main>
	)
}

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url)
	const header = request.headers.get('Cookie')

	const preferences: Partial<Preferences> = (await cookies.preferences.parse(header)) ?? {}
	const locale = url.searchParams.get('locale') ?? preferences.locale ?? 'en'

	const env = {
		VERSION: process.env.VERSION
	}

	return {
		env,
		locale,
		preferences,
		renderedAt: Date.now()
	}
}
