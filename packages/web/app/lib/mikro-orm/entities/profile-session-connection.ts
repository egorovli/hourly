import type { Rel } from '@mikro-orm/core'

import { Entity, Enum, ManyToOne, Property, PrimaryKeyProp } from '@mikro-orm/core'

import { ProfileConnectionType } from '~/domain/index.ts'
import { Profile } from './profile.ts'
import { Session } from './session.ts'

@Entity({
	tableName: 'profiles_on_sessions'
})
export class ProfileSessionConnection {
	@ManyToOne(() => Profile, { primary: true, fieldNames: ['profile_id', 'profile_provider'] })
	profile!: Rel<Profile>

	@ManyToOne(() => Session, { primary: true })
	session!: Rel<Session>

	@Enum({
		items: () => ProfileConnectionType,
		enumName: 'profile_connection_type'
	})
	connectionType!: ProfileConnectionType

	@Property({ name: 'created_at', columnType: 'timestamptz' })
	createdAt = new Date()

	@Property({ name: 'updated_at', columnType: 'timestamptz', onUpdate: () => new Date() })
	updatedAt = new Date();

	// This is needed for proper type checks in `FilterQuery`
	[PrimaryKeyProp]?: ['profile', 'session']
}
