import type { ProviderAccount } from './strategies/common.ts'

import { Authenticator } from 'remix-auth'

import { atlassianStrategy } from './strategies/atlassian.ts'
import { gitlabStrategy } from './strategies/gitlab.ts'

export const authenticator = new Authenticator<ProviderAccount>()

authenticator.use(atlassianStrategy, 'atlassian')
authenticator.use(gitlabStrategy, 'gitlab')
