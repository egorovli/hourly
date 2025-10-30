import type { Route } from './+types/__._index.ts'
import type { Preferences } from '~/domain/preferences.ts'

import { WorklogsPage } from '~/pages/worklogs/index.ts'
import * as cookies from '~/lib/cookies/index.ts'
import { mergePreferencesWithDefaults } from '~/lib/preferences/defaults.ts'
import { orm, Token } from '~/lib/mikro-orm/index.ts'
import { getSession } from '~/lib/session/storage.ts'

export default function WorklogsRoute({ loaderData }: Route.ComponentProps) {
	return <WorklogsPage loaderData={loaderData} />
}

export async function loader({ request }: Route.LoaderArgs) {
	const session = await getSession(request.headers.get('Cookie'))
	const user = session.get('user')

	if (!user?.atlassian?.id) {
		throw new Error('Atlassian profile ID not found. Please sign in.')
	}

	const em = orm.em.fork()
	const token = await em.findOne(Token, {
		profileId: user.atlassian.id,
		provider: 'atlassian'
	})

	if (!token?.accessToken) {
		throw new Error('Atlassian access token not found. Please reconnect your account.')
	}

	// Load user preferences from cookie and merge with defaults
	const header = request.headers.get('Cookie')
	const rawPreferences: Partial<Preferences> = (await cookies.preferences.parse(header)) ?? {}
	const preferences = mergePreferencesWithDefaults(rawPreferences, request)

	return {
		user,
		preferences
	}
}
