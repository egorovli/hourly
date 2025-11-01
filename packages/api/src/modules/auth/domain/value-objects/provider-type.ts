/**
 * ProviderType - Provider Type Enum
 *
 * Represents the type of service provider in the domain.
 * This is a domain-level abstraction that doesn't expose provider-specific names.
 *
 * Design Decision: Use domain-level enum instead of provider names (e.g., "jira", "gitlab").
 * This allows:
 * - Provider implementations can change without affecting domain model
 * - Easy to add new providers (e.g., Linear, GitHub) without changing core domain
 * - Clear separation: domain uses WORKLOG_SERVICE, infrastructure maps to atlassian/jira
 */
export enum ProviderType {
	/**
	 * Worklog service provider (currently Jira/Atlassian)
	 * Used for time tracking and worklog management.
	 */
	WORKLOG_SERVICE = 'WORKLOG_SERVICE',

	/**
	 * Git repository provider (currently GitLab)
	 * Used for source code and commit tracking.
	 */
	GIT_REPOSITORY = 'GIT_REPOSITORY'
}
