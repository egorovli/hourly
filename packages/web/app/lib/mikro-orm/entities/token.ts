import { Entity, PrimaryKey, Property, ManyToOne, PrimaryKeyProp } from '@mikro-orm/core'

import { Profile } from './profile.ts'

@Entity({
	tableName: 'tokens'
})
export class Token {
	@PrimaryKey({ name: 'profile_id' })
	profileId!: string

	@PrimaryKey()
	provider!: string

	@ManyToOne(() => Profile, { fieldNames: ['profile_id', 'provider'] })
	profile!: Profile

	@Property({ name: 'access_token', columnType: 'text' })
	accessToken!: string

	@Property({ name: 'refresh_token', columnType: 'text', nullable: true })
	refreshToken?: string

	@Property({ name: 'expires_at', columnType: 'text', nullable: true })
	expiresAt?: string

	@Property({ type: 'json' })
	scopes!: string[]

	@Property({ name: 'created_at', columnType: 'real' })
	createdAt = new Date()

	@Property({ name: 'updated_at', columnType: 'real', onUpdate: () => new Date() })
	updatedAt = new Date()

	// This is needed for proper type checks in `FilterQuery`
	declare [PrimaryKeyProp]: ['profileId', 'provider']
}
