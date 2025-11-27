import type { TypedInject, TypedMultiInject } from '@inversifyjs/strongly-typed'
import type { BindingMap } from './binding-map.ts'

import { inject, multiInject } from 'inversify'

export const $inject = inject as TypedInject<BindingMap>
export const $multiInject = multiInject as TypedMultiInject<BindingMap>
