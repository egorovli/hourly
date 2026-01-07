/// <reference lib="dom" />

import { GlobalRegistrator } from '@happy-dom/global-registrator'

// Register happy-dom globally before any tests run
GlobalRegistrator.register()

// Import jest-dom matchers for Testing Library
import '@testing-library/jest-dom'
