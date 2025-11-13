import type { Rel } from '@mikro-orm/core'

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
	profile!: Rel<Profile>

	@Property({ name: 'access_token', columnType: 'text' })
	accessToken!: string

	@Property({ name: 'refresh_token', columnType: 'text', nullable: true })
	refreshToken?: string

	@Property({ name: 'expires_at', columnType: 'timestamptz', nullable: true })
	expiresAt?: Date

	@Property({ columnType: 'text[]' })
	scopes!: string[]

	@Property({ name: 'created_at', columnType: 'timestamptz' })
	createdAt = new Date()

	@Property({ name: 'updated_at', columnType: 'timestamptz', onUpdate: () => new Date() })
	updatedAt = new Date();

	// This is needed for proper type checks in `FilterQuery`
	[PrimaryKeyProp]?: ['profileId', 'provider']
}
