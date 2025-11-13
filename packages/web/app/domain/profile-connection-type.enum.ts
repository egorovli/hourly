export enum ProfileConnectionType {
	/**
	 * Connection used to manage worklog entries (read, update, delete).
	 * Example: Atlassian (Jira) - used to write resulting worklogs.
	 */
	WorklogTarget = 'worklog-target',

	/**
	 * Connection used as a source of commits and other relevant data.
	 * Example: GitLab - used to extract issue references from commits.
	 */
	DataSource = 'data-source'
}

