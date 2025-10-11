export interface Options {
  accessToken: string
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

export interface Resource {
  id: string
  name: string
  url: string
  scopes: string[]
  avatarUrl?: string
}

export interface ListIssuesInput {
  projectId: string
}

export interface Issue {
  id: string
  key: string
}

export interface ListIssueIdsPaginatedOutput {
  issueIds: string[]
  nextPageToken?: string
}

export class AtlassianClient {
  private readonly baseUrl: string = 'https://api.atlassian.com'
  private readonly accessToken: string

  constructor (options: Options) {
    this.accessToken = options.accessToken

    if (typeof options.baseUrl === 'string') {
      this.baseUrl = options.baseUrl
    }
  }

  async getMe (): Promise<MeResponse> {
    let response = await fetch(`${this.baseUrl}/me`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user profile')
    }

    return response.json() as Promise<MeResponse>
  }

  async getAccessibleResources (): Promise<Resource[]> {
    let response = await fetch(`${this.baseUrl}/oauth/token/accessible-resources`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch accessible resources')
    }

    let resources = await response.json() as Resource[]
    return resources
  }

  async listIssues (input: ListIssuesInput): Promise<Issue[]> {
    let cursor: string | undefined
    let ids: string[] = []

    while (true) {
      let { issueIds, nextPageToken } = await this.listIssueIdsPaginated(input, cursor)

      ids.push(...issueIds)
      cursor = nextPageToken

      if (typeof cursor !== 'string') {
        break
      }
    }

    return ids
    // let url = new URL(`${this.baseUrl}/ex/jira/${input.projectId}/rest/api/3/search`)

    // url.searchParams.set('jql', 'assignee = currentUser()')
    // url.searchParams.set('fields', [ 'id', 'key', 'summary' ].join(','))

    // let response = await fetch(url.toString(), {
    //   method: 'GET',
    //   headers: {
    //     'Accept': 'application/json',
    //     'Authorization': `Bearer ${this.accessToken}`,
    //     'Content-Type': 'application/json'
    //   }
    // })

    // if (!response.ok) {
    //   throw new Error('Failed to fetch issues')
    // }

    // return response.json() as Promise<Issue[]>
  }

  private async listIssueIdsPaginated (input: ListIssuesInput, cursor?: string): Promise<ListIssueIdsPaginatedOutput> {
    let url = new URL(`${this.baseUrl}/ex/jira/${input.projectId}/rest/api/3/search/id`)

    let response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jql: 'status CHANGED DURING (startOfMonth(), endOfMonth())',
        maxResults: 50,
        nextPageToken: cursor
      })
    })

    if (!response.ok) {
      throw new Error('Failed to fetch issues')
    }

    return response.json() as Promise<ListIssueIdsPaginatedOutput>
  }

  private async listIssuesPaginated (input: ListIssuesInput, startAt = 0, maxResults = 50): Promise<Issue[]> {}
}
