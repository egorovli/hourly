import { render, screen } from '@testing-library/react'

import { Button } from './button.tsx'

describe('Button', () => {
	it('renders children', () => {
		render(<Button>Click me</Button>)
		expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
	})

	it('applies variant classes', () => {
		render(<Button variant='destructive'>Delete</Button>)
		expect(screen.getByRole('button')).toHaveClass('bg-destructive')
	})

	it('supports asChild pattern', () => {
		render(
			<Button asChild>
				<a href='/test'>Link</a>
			</Button>
		)
		expect(screen.getByRole('link', { name: 'Link' })).toBeInTheDocument()
	})
})
