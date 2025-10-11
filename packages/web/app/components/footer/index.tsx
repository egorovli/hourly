import { Container } from '~/components/container/index.tsx'

export function Footer(): React.ReactNode {
	return (
		<footer className='bg-black/10 text-white border-b border-b-gray-200 flex items-center'>
			<Container className='px-safe pb-safe-or-4 pt-4'>
				<h1 className='text-xl font-bold text-center'>Footer</h1>
			</Container>
		</footer>
	)
}
