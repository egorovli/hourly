import type { Route } from './+types/__._index.ts'

import { Link } from 'react-router'

export default function Home(): React.ReactNode {
	return (
		<div>
			<div>Home</div>
			<Link to='/slots'>Slots</Link>
		</div>
	)
}
