import {
	Entity,
	PrimaryKey,
	Property,
	OneToMany,
	ManyToMany,
	Collection,
	PrimaryKeyProp
} from '@mikro-orm/core'

import { Token } from './token.ts'
import { BaseEntity } from './base.ts'
import { Session } from './session.ts'
import { ProfileSessionConnection } from './profile-session-connection.ts'

@Entity({
	tableName: 'profiles'
})
export class Profile extends BaseEntity {
	@PrimaryKey()
	provider!: string

	@Property({ type: 'json' })
	data!: Record<string, unknown>

	@OneToMany(
		() => Token,
		token => token.profile
	)
	tokens = new Collection<Token>(this)

	@ManyToMany({
		entity: () => Session,
		pivotEntity: () => ProfileSessionConnection,
		inversedBy: session => session.profiles
	})
	sessions = new Collection<Session>(this);

	// This is needed for proper type checks in `FilterQuery`
	[PrimaryKeyProp]?: ['id', 'provider']
}
