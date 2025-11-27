import type { BindingMap } from './binding-map.ts'

import { TypedContainer } from '@inversifyjs/strongly-typed'

export const container = new TypedContainer<BindingMap>()
