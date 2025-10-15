import {
	Entity,
	PrimaryKey,
	Property,
	OneToMany,
	Collection,
	PrimaryKeyProp
} from '@mikro-orm/core'

import { Token } from './token.ts'
import { BaseEntity } from './base.ts'

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

	// This is needed for proper type checks in `FilterQuery`
	declare [PrimaryKeyProp]: ['id', 'provider']
}
