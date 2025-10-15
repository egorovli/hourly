import { Entity, Property } from '@mikro-orm/core'

import { BaseEntity } from './base.ts'

@Entity({
	tableName: 'sessions'
})
export class Session extends BaseEntity {
	@Property({ type: 'json' })
	data!: Record<string, unknown>

	@Property({ name: 'expires_at', columnType: 'real', nullable: true })
	expiresAt?: Date
}
