export interface Options {
	accessToken: string
	refreshToken?: string
	baseUrl?: string
}

export interface MeResponse {
	account_type: string
	account_id: string
	email: string
	name?: string
	picture?: string
	account_status: string
	nickname?: string
	zoneinfo?: string
	locale?: string
	extended_profile?: {
		job_title?: string
		organization?: string
		department?: string
		location?: string
	}
	last_updated: string
	email_verified: boolean
}

export interface AccessibleResource {
	id: string
	name: string
	url: string
	scopes?: string[]
	avatarUrl?: string
}

export interface ListJiraProjectsParams {
	startAt?: number
	maxResults?: number
	query?: string
}

export interface JiraProject {
	id: string
	key: string
	name: string
	avatarUrls?: Record<string, string>
}

export interface ListJiraProjectsResponse {
	projects: JiraProject[]
}

export interface ListJiraUsersParams {
	startAt?: number
	maxResults?: number
	query?: string
	includeInactive?: boolean
}

export interface JiraUser {
	accountId: string
	displayName?: string
	emailAddress?: string
	avatarUrls?: Record<string, string>
	active?: boolean
	timeZone?: string
	accountType?: string
}

export interface ListAssignableUsersParams {
	projectKey: string
	startAt?: number
	maxResults?: number
	query?: string
}

export interface SearchIssuesParams {
	cloudId: string
	jql: string
	startAt?: number
	maxResults?: number
	fields?: string[]
	expand?: string[]
}

export interface IssueSummary {
	id: string
	key: string
	fields: {
		summary?: string
		project?: {
			id: string
			key: string
			name: string
		}
	}
}

export interface SearchIssuesResponse {
	startAt: number
	maxResults: number
	total: number
	issues: IssueSummary[]
}

export interface IssueWorklog {
	id: string
	issueId: string
	started: string
	timeSpentSeconds: number
	timeSpent?: string
	author?: {
		accountId?: string
		displayName?: string
	}
	updateAuthor?: {
		accountId?: string
		displayName?: string
	}
	comment?: unknown
	created?: string
	updated?: string
}

export interface IssueWorklogResponse {
	startAt: number
	maxResults: number
	total: number
	worklogs: IssueWorklog[]
}

export interface JiraProjectSelection {
	cloudId: string
	projectId: string
	projectKey: string
	projectName: string
}

export interface JiraWorklogIssueBundle {
	issueId: string
	issueKey: string
	summary?: string
	project: {
		id: string
		key: string
		name: string
		cloudId: string
	}
	worklogs: IssueWorklog[]
}

export interface JiraWorklogsResult {
	issues: JiraWorklogIssueBundle[]
	summary: {
		totalIssuesMatched: number
		totalIssuesFetched: number
		totalWorklogs: number
		truncated: boolean
	}
}

export interface JiraWorklogDateRange {
	from: string
	to: string
}

export class AtlassianClientError extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly statusText: string,
		public readonly details?: unknown
	) {
		super(message)
		this.name = 'AtlassianClientError'
	}
}

export class AtlassianClient {
	private readonly baseUrl: string = 'https://api.atlassian.com'
	private readonly accessToken: string

	constructor(options: Options) {
		this.accessToken = options.accessToken
		this.baseUrl = options.baseUrl ?? this.baseUrl
	}

	private buildJiraUrl(cloudId: string, path: string) {
		return `${this.baseUrl}/ex/jira/${cloudId}${path}`
	}

	private async requestJson<T>(url: string, init?: RequestInit): Promise<T> {
		const response = await fetch(url, {
			...init,
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
				Accept: 'application/json',
				...(init?.headers ?? {})
			}
		})

		if (!response.ok) {
			let details: unknown = null
			try {
				details = await response.json()
			} catch {
				try {
					details = await response.text()
				} catch {
					details = null
				}
			}

			throw new AtlassianClientError(
				`Atlassian API request failed with status ${response.status}`,
				response.status,
				response.statusText,
				details
			)
		}

		if (response.status === 204) {
			return undefined as T
		}

		return response.json() as Promise<T>
	}

	async getMe(): Promise<MeResponse> {
		return this.requestJson<MeResponse>(`${this.baseUrl}/me`)
	}

	async getAccessibleResources(): Promise<AccessibleResource[]> {
		return this.requestJson<AccessibleResource[]>(
			`${this.baseUrl}/oauth/token/accessible-resources`
		)
	}

	async listJiraProjects(
		cloudId: string,
		params?: ListJiraProjectsParams
	): Promise<ListJiraProjectsResponse> {
		const startAt = params?.startAt ?? 0
		const maxResults = Math.min(Math.max(params?.maxResults ?? 50, 1), 100)
		const query = params?.query?.trim()

		const url = new URL(`${this.baseUrl}/ex/jira/${cloudId}/rest/api/3/project/search`)
		url.searchParams.set('startAt', String(startAt))
		url.searchParams.set('maxResults', String(maxResults))

		if (query) {
			url.searchParams.set('query', query)
		}

		const data = await this.requestJson<{
			values?: JiraProject[]
		}>(url.toString())

		return { projects: data.values ?? [] }
	}

	async listJiraUsers(cloudId: string, params?: ListJiraUsersParams): Promise<JiraUser[]> {
		const startAt = params?.startAt ?? 0
		const maxResults = Math.min(Math.max(params?.maxResults ?? 50, 1), 1000)
		const query = params?.query?.trim()
		const includeInactive = params?.includeInactive ?? false

		const url = new URL(this.buildJiraUrl(cloudId, '/rest/api/3/users/search'))
		url.searchParams.set('startAt', String(startAt))
		url.searchParams.set('maxResults', String(maxResults))
		url.searchParams.set('includeInactive', String(includeInactive))

		if (query) {
			url.searchParams.set('query', query)
		}

		return this.requestJson<JiraUser[]>(url.toString())
	}

	async listAssignableUsers(
		cloudId: string,
		params: ListAssignableUsersParams
	): Promise<JiraUser[]> {
		const startAt = params.startAt ?? 0
		const maxResults = Math.min(Math.max(params.maxResults ?? 50, 1), 1000)
		const query = params.query?.trim()

		const url = new URL(this.buildJiraUrl(cloudId, '/rest/api/3/user/assignable/search'))
		url.searchParams.set('project', params.projectKey)
		url.searchParams.set('startAt', String(startAt))
		url.searchParams.set('maxResults', String(maxResults))

		if (query) {
			url.searchParams.set('query', query)
		}

		return this.requestJson<JiraUser[]>(url.toString())
	}

	async searchIssues({
		cloudId,
		jql,
		startAt = 0,
		maxResults = 50,
		fields,
		expand
	}: SearchIssuesParams): Promise<SearchIssuesResponse> {
		const url = new URL(this.buildJiraUrl(cloudId, '/rest/api/3/search/jql'))
		url.searchParams.set('jql', jql)
		url.searchParams.set('startAt', String(startAt))
		url.searchParams.set('maxResults', String(maxResults))

		if (fields?.length) {
			for (const field of fields) {
				url.searchParams.append('fields', field)
			}
		}

		if (expand?.length) {
			for (const item of expand) {
				url.searchParams.append('expand', item)
			}
		}

		return this.requestJson<SearchIssuesResponse>(url.toString())
	}

	async getIssueWorklogs(
		cloudId: string,
		issueIdOrKey: string,
		params?: {
			startAt?: number
			maxResults?: number
			startedAfter?: number
			startedBefore?: number
			expand?: string
		}
	): Promise<IssueWorklogResponse> {
		const url = new URL(
			this.buildJiraUrl(cloudId, `/rest/api/3/issue/${encodeURIComponent(issueIdOrKey)}/worklog`)
		)

		if (params?.startAt !== undefined) {
			url.searchParams.set('startAt', String(params.startAt))
		}

		if (params?.maxResults !== undefined) {
			url.searchParams.set('maxResults', String(params.maxResults))
		}

		if (params?.startedAfter !== undefined) {
			url.searchParams.set('startedAfter', String(params.startedAfter))
		}

		if (params?.startedBefore !== undefined) {
			url.searchParams.set('startedBefore', String(params.startedBefore))
		}

		if (params?.expand) {
			url.searchParams.set('expand', params.expand)
		}

		return this.requestJson<IssueWorklogResponse>(url.toString())
	}

	async fetchWorklogsForProjects(
		selectedProjects: JiraProjectSelection[],
		dateRange: JiraWorklogDateRange
	): Promise<JiraWorklogsResult> {
		if (selectedProjects.length === 0) {
			return emptyWorklogResult()
		}

		const projectsByCloud = groupProjectsByCloud(selectedProjects)
		const issues: JiraWorklogIssueBundle[] = []

		let totalIssuesMatched = 0
		let totalIssuesFetched = 0
		let totalWorklogs = 0
		let truncated = false

		for (const [cloudId, projects] of projectsByCloud.entries()) {
			const jql = buildWorklogJql(
				projects.map(project => project.projectKey),
				dateRange
			)

			const issueSummaries = await fetchIssuesForJql({
				client: this,
				cloudId,
				jql
			})

			totalIssuesMatched += issueSummaries.totalMatched
			totalIssuesFetched += issueSummaries.issues.length

			if (issueSummaries.truncated) {
				truncated = true
			}

			if (issueSummaries.issues.length === 0) {
				continue
			}

			const fromEpochMillis = startOfDayEpochMillis(dateRange.from)
			const toEpochMillis = endOfDayEpochMillis(dateRange.to)

			const worklogBundles = await mapWithConcurrency(
				issueSummaries.issues,
				DEFAULT_CONCURRENCY,
				async issue => {
					const worklogs = await fetchAllWorklogsForIssue({
						client: this,
						cloudId,
						issue,
						startedAfter: fromEpochMillis - 1,
						startedBefore: toEpochMillis + 1
					})

					const projectKey = issue.fields.project?.key ?? ''
					const projectMatch = projects.find(project => project.projectKey === projectKey) ?? null

					return {
						issueId: issue.id,
						issueKey: issue.key,
						summary: issue.fields.summary,
						project: {
							id: projectMatch?.projectId ?? issue.fields.project?.id ?? '',
							key: projectMatch?.projectKey ?? projectKey,
							name: projectMatch?.projectName ?? issue.fields.project?.name ?? '',
							cloudId
						},
						worklogs
					}
				}
			)

			for (const bundle of worklogBundles) {
				totalWorklogs += bundle.worklogs.length
				issues.push(bundle)
			}
		}

		return {
			issues,
			summary: {
				totalIssuesMatched,
				totalIssuesFetched,
				totalWorklogs,
				truncated
			}
		}
	}
}

const ISSUE_SEARCH_PAGE_SIZE = 50
const ISSUE_SEARCH_MAX_RESULTS = 1000
const ISSUE_WORKLOG_PAGE_SIZE = 100
const ISSUE_WORKLOG_MAX_RESULTS = 5000
const DEFAULT_CONCURRENCY = 4

function emptyWorklogResult(): JiraWorklogsResult {
	return {
		issues: [],
		summary: {
			totalIssuesMatched: 0,
			totalIssuesFetched: 0,
			totalWorklogs: 0,
			truncated: false
		}
	}
}

function groupProjectsByCloud(projects: JiraProjectSelection[]) {
	const map = new Map<string, JiraProjectSelection[]>()

	for (const project of projects) {
		const existing = map.get(project.cloudId)
		if (existing) {
			existing.push(project)
		} else {
			map.set(project.cloudId, [project])
		}
	}

	return map
}

function buildWorklogJql(projectKeys: string[], dateRange: JiraWorklogDateRange) {
	const uniqueKeys = Array.from(
		new Set(
			projectKeys.filter((key): key is string => typeof key === 'string' && key.trim().length > 0)
		)
	)
	const [firstKey] = uniqueKeys
	if (!firstKey) {
		throw new Error('Unable to build JQL query without project keys')
	}
	const projectClause =
		uniqueKeys.length === 1
			? `project = "${escapeJqlString(firstKey)}"`
			: `project in (${uniqueKeys.map(key => `"${escapeJqlString(key)}"`).join(', ')})`

	return [
		projectClause,
		`worklogDate >= "${dateRange.from}"`,
		`worklogDate <= "${dateRange.to}"`
	].join(' AND ')
}

function escapeJqlString(input: string) {
	return input.replace(/\\|"/g, match => `\\${match}`)
}

async function fetchIssuesForJql({
	client,
	cloudId,
	jql
}: {
	client: AtlassianClient
	cloudId: string
	jql: string
}): Promise<{
	issues: IssueSummary[]
	totalMatched: number
	truncated: boolean
}> {
	let startAt = 0
	const issues: IssueSummary[] = []
	let total = 0
	let truncated = false

	for (let page = 0; page < ISSUE_SEARCH_MAX_RESULTS / ISSUE_SEARCH_PAGE_SIZE; page += 1) {
		const response = await client.searchIssues({
			cloudId,
			jql,
			startAt,
			maxResults: ISSUE_SEARCH_PAGE_SIZE,
			fields: ['summary', 'project']
		})

		if (page === 0) {
			total = response.total
		}

		if (response.issues.length === 0) {
			break
		}

		issues.push(...response.issues)

		startAt += response.issues.length

		if (startAt >= response.total) {
			break
		}
	}

	if (issues.length < total) {
		truncated = true
	}

	return {
		issues,
		totalMatched: total,
		truncated
	}
}

async function fetchAllWorklogsForIssue({
	client,
	cloudId,
	issue,
	startedAfter,
	startedBefore
}: {
	client: AtlassianClient
	cloudId: string
	issue: IssueSummary
	startedAfter: number
	startedBefore: number
}): Promise<IssueWorklog[]> {
	let startAt = 0
	const worklogs: IssueWorklog[] = []
	let total = 0

	for (let page = 0; page < ISSUE_WORKLOG_MAX_RESULTS / ISSUE_WORKLOG_PAGE_SIZE; page += 1) {
		const response = await client.getIssueWorklogs(cloudId, issue.id, {
			startAt,
			maxResults: ISSUE_WORKLOG_PAGE_SIZE,
			startedAfter,
			startedBefore
		})

		if (page === 0) {
			total = response.total
		}

		worklogs.push(...response.worklogs)

		if (response.worklogs.length === 0) {
			break
		}

		startAt += response.worklogs.length

		if (startAt >= response.total) {
			break
		}
	}

	if (worklogs.length < total) {
		return worklogs.slice(0, total)
	}

	return worklogs
}

function startOfDayEpochMillis(date: string) {
	return new Date(`${date}T00:00:00.000Z`).getTime()
}

function endOfDayEpochMillis(date: string) {
	return new Date(`${date}T23:59:59.999Z`).getTime()
}

async function mapWithConcurrency<T, R>(
	items: T[],
	concurrency: number,
	fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
	if (items.length === 0) {
		return []
	}

	const results: R[] = new Array(items.length)
	let currentIndex = 0

	const worker = async () => {
		// eslint-disable-next-line no-constant-condition
		while (true) {
			const index = currentIndex
			if (index >= items.length) {
				return
			}
			currentIndex += 1
			const item = items[index]!
			const result = await fn(item, index)
			results[index] = result
		}
	}

	const workers = Array.from(
		{ length: Math.min(concurrency, items.length) },
		async () => await worker()
	)

	await Promise.all(workers)

	return results
}
