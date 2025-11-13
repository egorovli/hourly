import type { Route } from './+types/auth.sign-in.ts'

import { Link } from 'react-router'

import * as sessionStorage from '~/lib/session/index.ts'

export default function SignInPage({ loaderData }: Route.ComponentProps): React.ReactNode {
	return (
		<div>
			<h1>Sign In</h1>

			<Link to='/auth/atlassian/sign-in'>Sign In with Atlassian</Link>
			<br />
			<Link to='/auth/gitlab/sign-in'>Sign In with GitLab</Link>
			<br />
			<pre>{JSON.stringify(loaderData, null, 2)}</pre>
		</div>
	)
}

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url)
	const session = await sessionStorage.getSession(request.headers.get('Cookie'))

	const redirectedFrom = url.searchParams.get('redirected-from') ?? undefined

	return {
		redirectedFrom,
		session,
		cookie: request.headers.get('Cookie'),
		foo: session.get('error'),
		d: session.get('user') ?? 123
	}
}
