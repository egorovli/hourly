import type { Route } from './+types/auth.sign-in.ts'

export default function SignInPage(): React.ReactNode {
	return <div>Sign In Page</div>
}

export async function loader(args: Route.LoaderArgs) {
	return {}
}
