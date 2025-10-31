import { Elysia } from 'elysia'

export const app = new Elysia()
	.get('/', 'Hello Elysia')
	.get('/user/:id', ({ params: { id } }) => id)
	.post('/form', ({ body }) => body)
