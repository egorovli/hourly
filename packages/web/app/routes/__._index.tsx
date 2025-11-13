import type { Route } from './+types/__._index.ts'

export default function WorklogsRoute({ loaderData }: Route.ComponentProps) {
	return <div>Worklogs</div>
}

export async function loader({ request }: Route.LoaderArgs) {
	return {}
}
