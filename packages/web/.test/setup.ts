/// <reference lib="dom" />

import { GlobalRegistrator } from '@happy-dom/global-registrator'

// Register happy-dom globally before any tests run
GlobalRegistrator.register()

// Import jest-dom matchers for Testing Library
import '@testing-library/jest-dom'

// Clean up the DOM after each test to prevent state leakage between reruns
import { afterEach } from 'bun:test'

afterEach(() => {
	// Clear document body to prevent elements from persisting between test reruns
	document.body.innerHTML = ''
})
