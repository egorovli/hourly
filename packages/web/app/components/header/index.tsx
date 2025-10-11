import { Container } from '~/components/container/index.tsx'

export function Header(): React.ReactNode {
	return (
		<header className='bg-black/10 text-white border-b border-b-gray-200 flex items-center'>
			<Container className='px-safe pt-safe-or-4 pb-4'>
				<h1 className='text-xl font-bold text-center'>Header</h1>
			</Container>
		</header>
	)
}
