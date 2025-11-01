import type { IdGenerator } from '../services/id-generator.ts'

import { Container } from 'inversify'

import { InjectionKey } from './injection-key.enum.ts'

import { BunUuidV7Generator } from '../../infrastructure/ids/bun-uuid-v7-generator.ts'

export const container = new Container()

container.bind<IdGenerator>(InjectionKey.IdGenerator).to(BunUuidV7Generator).inSingletonScope()
