declare global {
	namespace NodeJS {
		interface ProcessEnv extends R {
			NODE_ENV: string
			VERSION: string

			SESSION_SECURE: 'true' | 'false'
			DATABASE_URL: string

			OAUTH_ATLASSIAN_CLIENT_ID: string
			OAUTH_ATLASSIAN_CLIENT_SECRET: string
			OAUTH_ATLASSIAN_CALLBACK_URL: string
			OAUTH_ATLASSIAN_BASE_URL?: string

			OAUTH_GITLAB_CLIENT_ID: string
			OAUTH_GITLAB_CLIENT_SECRET: string
			OAUTH_GITLAB_CALLBACK_URL: string
			OAUTH_GITLAB_BASE_URL?: string
		}
	}
}

export {}
