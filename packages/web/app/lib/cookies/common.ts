/** biome-ignore-all lint/style/noProcessEnv: We need to access secrets */

const pattern = /^SESSION_SECRET_(\d+)$/

export const secrets = Object.entries(process.env)
	.map<[number, string | undefined]>(([key, value]) => [
		Number.parseInt(key.match(pattern)?.[1] ?? '', 10),
		value
	])
	.filter(([i, _value]) => !Number.isNaN(i))
	.sort(([a], [b]) => a - b)
	.map(([_i, value]) => value)
	.filter(Boolean)
