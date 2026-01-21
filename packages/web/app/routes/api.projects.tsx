import type { Route } from './+types/api.projects.ts'

import { auditActions, getAuditLogger, withAuditContext } from '~/lib/audit/index.ts'
import { requireAuthOrRespond } from '~/lib/auth/index.ts'
import { cached } from '~/lib/cached/index.ts'

export const loader = withAuditContext(async function loader({ request }: Route.LoaderArgs) {
	const auth = await requireAuthOrRespond(request)
	const auditLogger = getAuditLogger()

	const cacheOpts = { keyPrefix: `profile:${auth.profile.id}` }
	const getAccessibleResources = cached(
		auth.client.getAccessibleResources.bind(auth.client),
		cacheOpts
	)
	const getProjects = cached(auth.client.getProjects.bind(auth.client), cacheOpts)

	const accessibleResources = await getAccessibleResources()

	const projects = await Promise.all(
		accessibleResources.map(async resource => getProjects(resource.id))
	)

	const allProjects = projects.flat()

	auditLogger?.log(auditActions.dataRead.projects(allProjects.length))

	return allProjects
})
