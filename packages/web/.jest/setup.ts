import { TextEncoder, TextDecoder } from 'node:util'

import '@testing-library/jest-dom'

global.TextEncoder = TextEncoder

// @ts-expect-error // It's okay.
global.TextDecoder = TextDecoder
