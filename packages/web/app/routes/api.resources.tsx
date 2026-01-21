import type { Route } from './+types/api.resources.ts'

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

	const resources = await getAccessibleResources()

	auditLogger?.log(auditActions.dataRead.resources(resources.length))

	return resources
})
