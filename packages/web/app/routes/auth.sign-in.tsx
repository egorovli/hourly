import type { MetaDescriptor } from 'react-router'
import type { Route } from './+types/auth.sign-in.ts'

import { Link } from 'react-router'
import { useState } from 'react'

import { withRequestContext } from '~/lib/mikro-orm/index.ts'

export default function SignInPage(): React.ReactNode {
	const [provider, setProvider] = useState<string>('atlassian')

	return (
		<div>
			<h1>Sign In</h1>
			<Link to={`/auth/${provider}/sign-in`}>Sign In</Link>
			<Link to={`/auth/${provider}/sign-out`}>Sign Out</Link>
		</div>
	)
}

export const loader = withRequestContext(async function loader({
	request,
	...args
}: Route.LoaderArgs) {
	return {}
})

export function meta(args: Route.MetaArgs): MetaDescriptor[] {
	const title = 'Sign In • Hourly'

	const description =
		'Connect your worklog service and data sources to automatically generate time entries from your activity data. No more manual time tracking. Secure OAuth2 authentication with Atlassian Jira, GitLab, and more.'

	const keywords =
		'sign in, login, authentication, OAuth, Jira, GitLab, time tracking, worklog, automated time tracking, connect account'

	return [
		{ title },
		{ name: 'description', content: description },
		{ name: 'keywords', content: keywords },

		// Open Graph tags
		{ property: 'og:type', content: 'website' },
		{ property: 'og:title', content: title },
		{ property: 'og:description', content: description },
		// { property: 'og:url', content: `${baseUrl}${pathname}` },

		// Twitter Card tags
		{ name: 'twitter:card', content: 'summary_large_image' },
		{ name: 'twitter:title', content: title },
		{ name: 'twitter:description', content: description }
	]
}
