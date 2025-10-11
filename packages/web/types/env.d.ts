declare global {
	namespace NodeJS {
		interface ProcessEnv extends R {
			NODE_ENV: string
			VERSION: string

			SESSION_SECURE: 'true' | 'false'
			OAUTH_ATLASSIAN_CLIENT_ID: string
			OAUTH_ATLASSIAN_CLIENT_SECRET: string
			OAUTH_ATLASSIAN_CALLBACK_URL: string
		}
	}
}

export {}
