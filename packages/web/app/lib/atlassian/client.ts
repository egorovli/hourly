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
		updated?: string
		created?: string
		status?: {
			name?: string
		}
		assignee?: {
			accountId?: string
			displayName?: string
		}
		reporter?: {
			accountId?: string
			displayName?: string
		}
		creator?: {
			accountId?: string
			displayName?: string
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

export interface JiraTouchedIssuesResult {
	issues: IssueSummary[]
	summary: {
		totalIssuesMatched: number
		truncated: boolean
	}
}

export interface JiraWorklogDateRange {
	from: string
	to: string
}

export interface FetchWorklogEntriesOptions {
	projectIds: string[]
	userIds?: string[]
	dateRange: JiraWorklogDateRange
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

	async fetchWorklogEntries({
		projectIds,
		userIds,
		dateRange
	}: FetchWorklogEntriesOptions): Promise<JiraWorklogsResult> {
		const uniqueProjectIds = Array.from(
			new Set(projectIds.map(id => id.trim()).filter((id): id is string => id.length > 0))
		)

		if (uniqueProjectIds.length === 0) {
			return emptyWorklogResult()
		}

		const uniqueUserIds = Array.from(
			new Set((userIds ?? []).map(id => id.trim()).filter((id): id is string => id.length > 0))
		)

		const projects = await resolveProjectSelections({
			client: this,
			projectIds: uniqueProjectIds
		})

		if (projects.length === 0) {
			return emptyWorklogResult()
		}

		const projectsByCloud = groupProjectsByCloud(projects)
		const authorIdSet = new Set(uniqueUserIds)
		const issues: JiraWorklogIssueBundle[] = []

		let totalIssuesMatched = 0
		let totalIssuesFetched = 0
		let totalWorklogs = 0
		let truncated = false

		const startedAfter = startOfDayEpochMillis(dateRange.from) - 1
		const startedBefore = endOfDayEpochMillis(dateRange.to) + 1

		for (const [cloudId, selections] of projectsByCloud.entries()) {
			const jql = buildWorklogJql(
				selections.map(project => project.projectKey),
				dateRange,
				uniqueUserIds
			)

			const issueSummaries = await fetchIssuesForJql({
				client: this,
				cloudId,
				jql
			})

			totalIssuesMatched += issueSummaries.totalMatched
			truncated ||= issueSummaries.truncated

			if (issueSummaries.issues.length === 0) {
				continue
			}

			const selectionByKey = new Map(
				selections.map(project => [project.projectKey, project] as const)
			)

			for (const issue of issueSummaries.issues) {
				const { worklogs, truncated: worklogsTruncated } = await fetchIssueWorklogs({
					client: this,
					cloudId,
					issue,
					startedAfter,
					startedBefore,
					authorIds: authorIdSet
				})

				if (worklogs.length === 0) {
					continue
				}

				truncated ||= worklogsTruncated

				const projectKey = issue.fields.project?.key ?? ''
				const projectMatch = selectionByKey.get(projectKey) ?? null

				issues.push({
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
				})

				totalIssuesFetched += 1
				totalWorklogs += worklogs.length
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

	async fetchTouchedIssues({
		projectIds,
		userIds,
		dateRange
	}: FetchWorklogEntriesOptions): Promise<JiraTouchedIssuesResult> {
		const uniqueProjectIds = Array.from(
			new Set(projectIds.map(id => id.trim()).filter((id): id is string => id.length > 0))
		)

		if (uniqueProjectIds.length === 0) {
			return emptyTouchedIssuesResult()
		}

		const uniqueUserIds = Array.from(
			new Set((userIds ?? []).map(id => id.trim()).filter((id): id is string => id.length > 0))
		)

		if (uniqueUserIds.length === 0) {
			return emptyTouchedIssuesResult()
		}

		const projects = await resolveProjectSelections({
			client: this,
			projectIds: uniqueProjectIds
		})

		if (projects.length === 0) {
			return emptyTouchedIssuesResult()
		}

		const projectsByCloud = groupProjectsByCloud(projects)
		const issuesById = new Map<string, IssueSummary>()
		let totalIssuesMatched = 0
		let truncated = false

		for (const [cloudId, selections] of projectsByCloud.entries()) {
			const jql = buildTouchedIssuesJql(
				selections.map(project => project.projectKey),
				dateRange,
				uniqueUserIds
			)

			const issueSummaries = await fetchIssuesForJql({
				client: this,
				cloudId,
				jql,
				fields: [
					'summary',
					'project',
					'updated',
					'created',
					'status',
					'assignee',
					'reporter',
					'creator'
				]
			})

			totalIssuesMatched += issueSummaries.totalMatched
			truncated ||= issueSummaries.truncated

			for (const issue of issueSummaries.issues) {
				issuesById.set(issue.id, issue)
			}
		}

		return {
			issues: Array.from(issuesById.values()),
			summary: {
				totalIssuesMatched,
				truncated
			}
		}
	}

	async fetchIssuesByKeys(issueKeys: string[]): Promise<JiraTouchedIssuesResult> {
		const uniqueKeys = Array.from(
			new Set(
				issueKeys
					.map(key => key.trim().toUpperCase())
					.filter((key): key is string => key.length > 0)
			)
		)

		if (uniqueKeys.length === 0) {
			return emptyTouchedIssuesResult()
		}

		const resources = await this.getAccessibleResources()
		if (resources.length === 0) {
			return emptyTouchedIssuesResult()
		}

		const issuesById = new Map<string, IssueSummary>()
		const matchedKeys = new Set<string>()
		const fields = [
			'summary',
			'project',
			'updated',
			'created',
			'status',
			'assignee',
			'reporter',
			'creator'
		]

		const chunks = chunkArray(uniqueKeys, ISSUE_KEY_QUERY_CHUNK_SIZE)

		for (const chunk of chunks) {
			for (const resource of resources) {
				const jql = buildIssueKeyJql(chunk)
				const issueSummaries = await fetchIssuesForJql({
					client: this,
					cloudId: resource.id,
					jql,
					fields
				})

				for (const issue of issueSummaries.issues) {
					issuesById.set(issue.id, issue)
					if (issue.key) {
						matchedKeys.add(issue.key.toUpperCase())
					}
				}

				if (matchedKeys.size >= uniqueKeys.length) {
					break
				}
			}

			if (matchedKeys.size >= uniqueKeys.length) {
				break
			}
		}

		return {
			issues: Array.from(issuesById.values()),
			summary: {
				totalIssuesMatched: matchedKeys.size,
				truncated: matchedKeys.size < uniqueKeys.length
			}
		}
	}
}

const ISSUE_SEARCH_PAGE_SIZE = 50
const ISSUE_SEARCH_MAX_RESULTS = 1000
const ISSUE_WORKLOG_PAGE_SIZE = 100
const ISSUE_WORKLOG_MAX_RESULTS = 5000
const ISSUE_KEY_QUERY_CHUNK_SIZE = 40

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

function emptyTouchedIssuesResult(): JiraTouchedIssuesResult {
	return {
		issues: [],
		summary: {
			totalIssuesMatched: 0,
			truncated: false
		}
	}
}

async function resolveProjectSelections({
	client,
	projectIds
}: {
	client: AtlassianClient
	projectIds: string[]
}): Promise<JiraProjectSelection[]> {
	if (projectIds.length === 0) {
		return []
	}

	const remaining = new Set(projectIds)
	const selections: JiraProjectSelection[] = []
	const resources = await client.getAccessibleResources()

	for (const resource of resources) {
		const { projects } = await client.listJiraProjects(resource.id)

		for (const project of projects) {
			if (!remaining.has(project.id)) {
				continue
			}

			selections.push({
				cloudId: resource.id,
				projectId: project.id,
				projectKey: project.key,
				projectName: project.name
			})

			remaining.delete(project.id)
		}

		if (remaining.size === 0) {
			break
		}
	}

	return selections
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

function buildWorklogJql(
	projectKeys: string[],
	dateRange: JiraWorklogDateRange,
	authorIds: string[]
) {
	const uniqueKeys = Array.from(
		new Set(
			projectKeys.filter((key): key is string => typeof key === 'string' && key.trim().length > 0)
		)
	)
	const [firstKey] = uniqueKeys
	if (!firstKey) {
		throw new Error('Unable to build JQL query without project keys')
	}

	const clauses = [
		uniqueKeys.length === 1
			? `project = "${escapeJqlString(firstKey)}"`
			: `project in (${uniqueKeys.map(key => `"${escapeJqlString(key)}"`).join(', ')})`,
		`worklogDate >= "${dateRange.from}"`,
		`worklogDate <= "${dateRange.to}"`
	]

	if (authorIds.length === 1) {
		clauses.push(`worklogAuthor = "${escapeJqlString(authorIds[0]!)}"`)
	} else if (authorIds.length > 1) {
		clauses.push(`worklogAuthor in (${authorIds.map(id => `"${escapeJqlString(id)}"`).join(', ')})`)
	}

	return clauses.join(' AND ')
}

function buildTouchedIssuesJql(
	projectKeys: string[],
	dateRange: JiraWorklogDateRange,
	authorIds: string[]
) {
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

	const clauses = [projectClause, `updated >= "${dateRange.from}"`, `updated <= "${dateRange.to}"`]

	if (authorIds.length === 1) {
		const [author] = authorIds
		const escaped = `"${escapeJqlString(author!)}"`
		clauses.push(
			`(assignee = ${escaped} OR reporter = ${escaped} OR creator = ${escaped} OR worklogAuthor = ${escaped})`
		)
	} else if (authorIds.length > 1) {
		const escapedAuthors = authorIds.map(id => `"${escapeJqlString(id)}"`)
		const group = `(${escapedAuthors.join(', ')})`
		clauses.push(
			`(assignee in ${group} OR reporter in ${group} OR creator in ${group} OR worklogAuthor in ${group})`
		)
	}

	return clauses.join(' AND ')
}

function buildIssueKeyJql(issueKeys: string[]) {
	const clauses = issueKeys.map(key => `"${escapeJqlString(key)}"`)
	return `issuekey in (${clauses.join(', ')})`
}

function escapeJqlString(input: string) {
	return input.replace(/\\|"/g, match => `\\${match}`)
}

async function fetchIssuesForJql({
	client,
	cloudId,
	jql,
	fields
}: {
	client: AtlassianClient
	cloudId: string
	jql: string
	fields?: string[]
}): Promise<{
	issues: IssueSummary[]
	totalMatched: number
	truncated: boolean
}> {
	let startAt = 0
	let total: number | null = null
	const issuesById = new Map<string, IssueSummary>()

	for (let page = 0; page < ISSUE_SEARCH_MAX_RESULTS / ISSUE_SEARCH_PAGE_SIZE; page += 1) {
		const response = await client.searchIssues({
			cloudId,
			jql,
			startAt,
			maxResults: ISSUE_SEARCH_PAGE_SIZE,
			fields: fields?.length ? fields : ['summary', 'project']
		})

		if (page === 0 && typeof response.total === 'number') {
			total = response.total
		}

		if (response.issues.length === 0) {
			break
		}

		const previousCount = issuesById.size

		for (const issue of response.issues) {
			issuesById.set(issue.id, issue)
		}

		startAt += response.issues.length

		if (typeof response.total === 'number' && startAt >= response.total) {
			break
		}

		if (issuesById.size === previousCount) {
			break
		}
	}

	const issues = Array.from(issuesById.values())
	const totalMatched = total ?? issues.length
	const truncated = totalMatched > issues.length

	return {
		issues,
		totalMatched,
		truncated
	}
}

async function fetchIssueWorklogs({
	client,
	cloudId,
	issue,
	startedAfter,
	startedBefore,
	authorIds
}: {
	client: AtlassianClient
	cloudId: string
	issue: IssueSummary
	startedAfter: number
	startedBefore: number
	authorIds: Set<string>
}): Promise<{
	worklogs: IssueWorklog[]
	truncated: boolean
}> {
	let startAt = 0
	const worklogs: IssueWorklog[] = []
	let truncated = false

	for (let page = 0; page < ISSUE_WORKLOG_MAX_RESULTS / ISSUE_WORKLOG_PAGE_SIZE; page += 1) {
		const response = await client.getIssueWorklogs(cloudId, issue.id, {
			startAt,
			maxResults: ISSUE_WORKLOG_PAGE_SIZE,
			startedAfter,
			startedBefore
		})

		if (page === 0 && response.total > ISSUE_WORKLOG_MAX_RESULTS) {
			truncated = true
		}

		if (response.worklogs.length === 0) {
			break
		}

		for (const worklog of response.worklogs) {
			if (authorIds.size > 0) {
				const authorId = worklog.author?.accountId
				if (!authorId || !authorIds.has(authorId)) {
					continue
				}
			}

			worklogs.push(worklog)
		}

		startAt += response.worklogs.length

		if (startAt >= response.total) {
			break
		}
	}

	return {
		worklogs,
		truncated
	}
}

function startOfDayEpochMillis(date: string) {
	return new Date(`${date}T00:00:00.000Z`).getTime()
}

function endOfDayEpochMillis(date: string) {
	return new Date(`${date}T23:59:59.999Z`).getTime()
}

function chunkArray<T>(items: T[], size: number): T[][] {
	if (size <= 0) {
		return [items]
	}

	const chunks: T[][] = []
	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size))
	}

	return chunks
}
