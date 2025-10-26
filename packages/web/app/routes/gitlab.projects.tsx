import type { Route } from './+types/gitlab.projects.ts'

import { GitLabClient } from '~/lib/gitlab/client.ts'
import { orm, Token } from '~/lib/mikro-orm/index.ts'
import * as sessionStorage from '~/lib/session/storage.ts'
import { invariant } from '~/lib/util/invariant.ts'

export async function loader({ request }: Route.LoaderArgs) {
	const session = await sessionStorage.getSession(request.headers.get('Cookie'))
	const user = session.get('user')

	invariant(user?.gitlab?.id, 'User is not authenticated with GitLab')

	const em = orm.em.fork()
	const token = await em.findOne(Token, {
		profileId: user.gitlab.id,
		provider: 'gitlab'
	})

	invariant(token?.accessToken, 'GitLab access token not found. Please reconnect your account.')

	const client = new GitLabClient({
		accessToken: token.accessToken,
		refreshToken: token.refreshToken,
		baseUrl: user.gitlab.baseUrl ?? undefined
	})

	const projects = await client.listAllProjects()

	return {
		projects
	}
}
