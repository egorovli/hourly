import type { Route } from './+types/auth.sign-in.ts'

import { Link, useSearchParams } from 'react-router'

import { createSessionStorage } from '~/lib/session/index.ts'
import { withRequestContext } from '~/lib/mikro-orm/index.ts'
import { useCallback } from 'react'

export default function SignInPage({ loaderData }: Route.ComponentProps): React.ReactNode {
	const [searchParams] = useSearchParams()

	const getSignInUrl = useCallback(
		(base: string): string => {
			const keys = ['redirected-from']
			const params = new URLSearchParams()

			for (const key of keys) {
				const value = searchParams.get(key)
				if (value) {
					params.set(key, value)
				}
			}

			const search = params.toString()
			return search.length > 0 ? `${base}?${search}` : base
		},
		[searchParams]
	)

	return (
		<div>
			<h1>Sign In</h1>

			<Link to={getSignInUrl('/auth/atlassian/sign-in')}>Sign In with Atlassian</Link>
			<br />
			<Link to={getSignInUrl('/auth/gitlab/sign-in')}>Sign In with GitLab</Link>
			<br />
			<pre>{JSON.stringify(loaderData, null, 2)}</pre>
		</div>
	)
}

export const loader = withRequestContext(async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url)
	const sessionStorage = createSessionStorage()
	const session = await sessionStorage.getSession(request.headers.get('Cookie'))

	const redirectedFrom = url.searchParams.get('redirected-from') ?? undefined

	return {}
})
