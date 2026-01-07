import { cn } from './cn.ts'

describe('cn', () => {
	it('merges class names', () => {
		expect(cn('foo', 'bar')).toBe('foo bar')
	})

	it('handles conditional classes', () => {
		expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
	})

	it('merges tailwind conflicts correctly', () => {
		expect(cn('px-2', 'px-4')).toBe('px-4')
	})
})
