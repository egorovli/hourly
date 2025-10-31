import { Command } from 'commander'

import { serve } from './serve.ts'

export let program = new Command()
	.version(Bun.env.VERSION ?? '0.0.0', '--version')
	.addCommand(serve, { isDefault: true })
	.helpCommand(false)
