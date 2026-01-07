import { invariant } from './invariant.ts'

describe('invariant', () => {
	it('does not throw when condition is truthy', () => {
		expect(() => invariant(true)).not.toThrow()
		expect(() => invariant(1)).not.toThrow()
		expect(() => invariant('string')).not.toThrow()
	})

	it('throws when condition is falsy', () => {
		expect(() => invariant(false)).toThrow()
		expect(() => invariant(null)).toThrow()
		expect(() => invariant(undefined)).toThrow()
	})

	it('includes message in error', () => {
		expect(() => invariant(false, 'custom message')).toThrow('custom message')
	})
})
