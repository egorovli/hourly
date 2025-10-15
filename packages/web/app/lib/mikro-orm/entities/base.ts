import { Entity, PrimaryKey, Property } from '@mikro-orm/core'
import { nanoid } from 'nanoid'

@Entity({
	abstract: true
})
export abstract class BaseEntity {
	@PrimaryKey()
	id: string = nanoid()

	@Property({ name: 'created_at', columnType: 'real' })
	createdAt = new Date()

	@Property({ name: 'updated_at', columnType: 'real', onUpdate: () => new Date() })
	updatedAt = new Date()
}
