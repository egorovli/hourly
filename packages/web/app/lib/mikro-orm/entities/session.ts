import { Entity, Property, ManyToMany, Collection } from '@mikro-orm/core'

import { BaseEntity } from './base.ts'
import { Profile } from './profile.ts'
import { ProfileSessionConnection } from './profile-session-connection.ts'

@Entity({
	tableName: 'sessions'
})
export class Session extends BaseEntity {
	@Property({ type: 'json' })
	data!: Record<string, unknown>

	@Property({ name: 'expires_at', columnType: 'real', nullable: true })
	expiresAt?: Date

	@ManyToMany({
		entity: () => Profile,
		pivotEntity: () => ProfileSessionConnection,
		mappedBy: profile => profile.sessions
	})
	profiles = new Collection<Profile>(this)
}
