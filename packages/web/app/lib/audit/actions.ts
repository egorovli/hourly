import type { CreateAuditLogInput } from './logger.ts'

import { AuditLogActionType } from '~/domain/audit-log-action-type.enum.ts'
import { AuditLogOutcome } from '~/domain/audit-log-outcome.enum.ts'
import { AuditLogSeverity } from '~/domain/audit-log-severity.enum.ts'
import { AuditLogTargetResourceType } from '~/domain/audit-log-target-resource-type.enum.ts'

/**
 * Predefined audit actions organized by category.
 * These provide consistent, well-structured audit log entries.
 */
export const auditActions = {
	/**
	 * Authentication events
	 */
	auth: {
		signInSuccess: (
			profileId: string,
			provider: string,
			sessionId: string
		): CreateAuditLogInput => ({
			actionType: AuditLogActionType.Authentication,
			actionDescription: `User signed in via ${provider} OAuth`,
			targetResourceType: AuditLogTargetResourceType.Session,
			targetResourceId: sessionId,
			outcome: AuditLogOutcome.Success,
			severity: AuditLogSeverity.Info,
			metadata: { profileId, provider }
		}),

		signInFailure: (provider: string, reason: string): CreateAuditLogInput => ({
			actionType: AuditLogActionType.Authentication,
			actionDescription: `Authentication failed via ${provider}: ${reason}`,
			targetResourceType: AuditLogTargetResourceType.Session,
			outcome: AuditLogOutcome.Failure,
			severity: AuditLogSeverity.Warning,
			metadata: { provider, reason }
		}),

		signOut: (sessionId: string): CreateAuditLogInput => ({
			actionType: AuditLogActionType.Authentication,
			actionDescription: 'User signed out',
			targetResourceType: AuditLogTargetResourceType.Session,
			targetResourceId: sessionId,
			outcome: AuditLogOutcome.Success,
			severity: AuditLogSeverity.Info
		}),

		sessionExpired: (sessionId: string): CreateAuditLogInput => ({
			actionType: AuditLogActionType.Authentication,
			actionDescription: 'Session expired',
			targetResourceType: AuditLogTargetResourceType.Session,
			targetResourceId: sessionId,
			outcome: AuditLogOutcome.Failure,
			severity: AuditLogSeverity.Info
		}),

		noSessionCookie: (): CreateAuditLogInput => ({
			actionType: AuditLogActionType.Authentication,
			actionDescription: 'Authentication failed: no session cookie',
			targetResourceType: AuditLogTargetResourceType.Session,
			outcome: AuditLogOutcome.Failure,
			severity: AuditLogSeverity.Warning
		}),

		sessionNotFound: (sessionId: string): CreateAuditLogInput => ({
			actionType: AuditLogActionType.Authentication,
			actionDescription: 'Authentication failed: session not found',
			targetResourceType: AuditLogTargetResourceType.Session,
			targetResourceId: sessionId,
			outcome: AuditLogOutcome.Failure,
			severity: AuditLogSeverity.Warning
		}),

		noProfileConnection: (): CreateAuditLogInput => ({
			actionType: AuditLogActionType.Authentication,
			actionDescription: 'Authentication failed: no profile connection',
			targetResourceType: AuditLogTargetResourceType.Profile,
			outcome: AuditLogOutcome.Failure,
			severity: AuditLogSeverity.Warning
		}),

		noToken: (profileId: string): CreateAuditLogInput => ({
			actionType: AuditLogActionType.Authentication,
			actionDescription: 'Authentication failed: no token found',
			targetResourceType: AuditLogTargetResourceType.Token,
			outcome: AuditLogOutcome.Failure,
			severity: AuditLogSeverity.Warning,
			metadata: { profileId }
		}),

		tokenExpired: (profileId: string, provider: string): CreateAuditLogInput => ({
			actionType: AuditLogActionType.Authentication,
			actionDescription: 'Authentication failed: token expired',
			targetResourceType: AuditLogTargetResourceType.Token,
			outcome: AuditLogOutcome.Failure,
			severity: AuditLogSeverity.Warning,
			metadata: { profileId, provider }
		})
	},

	/**
	 * Authorization events
	 */
	authz: {
		adminAccessGranted: (): CreateAuditLogInput => ({
			actionType: AuditLogActionType.Authorization,
			actionDescription: 'Admin access granted',
			targetResourceType: AuditLogTargetResourceType.AuditLog,
			outcome: AuditLogOutcome.Success,
			severity: AuditLogSeverity.Info
		}),

		adminAccessDenied: (
			profileId: string,
			provider: string,
			reason: string
		): CreateAuditLogInput => ({
			actionType: AuditLogActionType.Authorization,
			actionDescription: `Admin access denied: ${reason}`,
			targetResourceType: AuditLogTargetResourceType.AuditLog,
			outcome: AuditLogOutcome.Failure,
			severity: AuditLogSeverity.Critical,
			metadata: { profileId, provider, reason }
		})
	},

	/**
	 * Data read events ("who viewed what")
	 */
	dataRead: {
		resources: (count: number, metadata?: Record<string, unknown>): CreateAuditLogInput => ({
			actionType: AuditLogActionType.DataRead,
			actionDescription: `Fetched ${count} accessible resources`,
			targetResourceType: AuditLogTargetResourceType.Integration,
			outcome: AuditLogOutcome.Success,
			severity: AuditLogSeverity.Debug,
			metadata: { resultCount: count, ...metadata }
		}),

		projects: (count: number, metadata?: Record<string, unknown>): CreateAuditLogInput => ({
			actionType: AuditLogActionType.DataRead,
			actionDescription: `Fetched ${count} projects`,
			targetResourceType: AuditLogTargetResourceType.Project,
			outcome: AuditLogOutcome.Success,
			severity: AuditLogSeverity.Debug,
			metadata: { resultCount: count, ...metadata }
		}),

		users: (filters: Record<string, unknown>, count: number): CreateAuditLogInput => ({
			actionType: AuditLogActionType.DataRead,
			actionDescription: `Fetched ${count} users`,
			targetResourceType: AuditLogTargetResourceType.Profile,
			outcome: AuditLogOutcome.Success,
			severity: AuditLogSeverity.Info,
			metadata: { filters, resultCount: count }
		}),

		issues: (filters: Record<string, unknown>, count: number): CreateAuditLogInput => ({
			actionType: AuditLogActionType.DataRead,
			actionDescription: `Fetched ${count} issues`,
			targetResourceType: AuditLogTargetResourceType.Issue,
			outcome: AuditLogOutcome.Success,
			severity: AuditLogSeverity.Debug,
			metadata: { filters, resultCount: count }
		}),

		worklogEntries: (filters: Record<string, unknown>, count: number): CreateAuditLogInput => ({
			actionType: AuditLogActionType.DataRead,
			actionDescription: `Fetched ${count} worklog entries`,
			targetResourceType: AuditLogTargetResourceType.Worklog,
			outcome: AuditLogOutcome.Success,
			severity: AuditLogSeverity.Info,
			metadata: { filters, resultCount: count }
		}),

		auditLogs: (filters: Record<string, unknown>, count: number): CreateAuditLogInput => ({
			actionType: AuditLogActionType.DataRead,
			actionDescription: `Fetched ${count} audit log entries`,
			targetResourceType: AuditLogTargetResourceType.AuditLog,
			outcome: AuditLogOutcome.Success,
			severity: AuditLogSeverity.Info,
			metadata: { filters, resultCount: count }
		})
	},

	/**
	 * Data mutation events
	 */
	dataMutation: {
		worklogSaveSuccess: (
			successCount: number,
			entries: Array<{ issueKey: string; timeSpentSeconds: number }>
		): CreateAuditLogInput => ({
			actionType: AuditLogActionType.DataModification,
			actionDescription: `Saved ${successCount} worklog entries`,
			targetResourceType: AuditLogTargetResourceType.Worklog,
			outcome: AuditLogOutcome.Success,
			severity: AuditLogSeverity.Info,
			metadata: { successCount, entries }
		}),

		worklogSavePartial: (
			successCount: number,
			failureCount: number,
			errors: Array<{ issueKey: string; error: string }>
		): CreateAuditLogInput => ({
			actionType: AuditLogActionType.DataModification,
			actionDescription: `Partially saved worklogs: ${successCount} success, ${failureCount} failed`,
			targetResourceType: AuditLogTargetResourceType.Worklog,
			outcome: AuditLogOutcome.Failure,
			severity: AuditLogSeverity.Warning,
			metadata: { successCount, failureCount, errors }
		}),

		worklogSaveFailure: (
			reason: string,
			entries: Array<{ issueKey: string; timeSpentSeconds: number }>
		): CreateAuditLogInput => ({
			actionType: AuditLogActionType.DataModification,
			actionDescription: `Failed to save worklog entries: ${reason}`,
			targetResourceType: AuditLogTargetResourceType.Worklog,
			outcome: AuditLogOutcome.Failure,
			severity: AuditLogSeverity.Error,
			metadata: { reason, entries }
		}),

		worklogDeleted: (worklogId: string, issueKey: string): CreateAuditLogInput => ({
			actionType: AuditLogActionType.DataModification,
			actionDescription: `Deleted worklog ${worklogId} from ${issueKey}`,
			targetResourceType: AuditLogTargetResourceType.Worklog,
			targetResourceId: worklogId,
			outcome: AuditLogOutcome.Success,
			severity: AuditLogSeverity.Info,
			metadata: { issueKey }
		}),

		worklogDeleteSuccess: (
			successCount: number,
			entries: Array<{ worklogId: string; issueKey: string }>
		): CreateAuditLogInput => ({
			actionType: AuditLogActionType.DataModification,
			actionDescription: `Deleted ${successCount} worklog entries`,
			targetResourceType: AuditLogTargetResourceType.Worklog,
			outcome: AuditLogOutcome.Success,
			severity: AuditLogSeverity.Info,
			metadata: { successCount, entries }
		}),

		worklogDeletePartial: (
			successCount: number,
			failureCount: number,
			errors: Array<{ worklogId: string; issueKey: string; error: string }>
		): CreateAuditLogInput => ({
			actionType: AuditLogActionType.DataModification,
			actionDescription: `Partially deleted worklogs: ${successCount} success, ${failureCount} failed`,
			targetResourceType: AuditLogTargetResourceType.Worklog,
			outcome: AuditLogOutcome.Failure,
			severity: AuditLogSeverity.Warning,
			metadata: { successCount, failureCount, errors }
		}),

		worklogDeleteFailure: (
			reason: string,
			entries: Array<{ worklogId: string; issueKey: string }>
		): CreateAuditLogInput => ({
			actionType: AuditLogActionType.DataModification,
			actionDescription: `Failed to delete worklog entries: ${reason}`,
			targetResourceType: AuditLogTargetResourceType.Worklog,
			outcome: AuditLogOutcome.Failure,
			severity: AuditLogSeverity.Error,
			metadata: { reason, entries }
		}),

		worklogSyncStarted: (saveCount: number, deleteCount: number): CreateAuditLogInput => ({
			actionType: AuditLogActionType.DataModification,
			actionDescription: `Started sync: ${deleteCount} deletes, ${saveCount} saves`,
			targetResourceType: AuditLogTargetResourceType.Worklog,
			outcome: AuditLogOutcome.Success,
			severity: AuditLogSeverity.Info,
			metadata: { saveCount, deleteCount }
		}),

		worklogSyncCompleted: (
			outcome: 'success' | 'partial' | 'failure' | 'empty',
			summary: {
				deletesSucceeded: number
				deletesFailed: number
				savesSucceeded: number
				savesFailed: number
			}
		): CreateAuditLogInput => ({
			actionType: AuditLogActionType.DataModification,
			actionDescription: `Sync completed: ${summary.deletesSucceeded} deleted, ${summary.savesSucceeded} saved`,
			targetResourceType: AuditLogTargetResourceType.Worklog,
			outcome:
				outcome === 'success' || outcome === 'empty'
					? AuditLogOutcome.Success
					: outcome === 'partial'
						? AuditLogOutcome.Failure
						: AuditLogOutcome.Failure,
			severity:
				outcome === 'success' || outcome === 'empty'
					? AuditLogSeverity.Info
					: outcome === 'partial'
						? AuditLogSeverity.Warning
						: AuditLogSeverity.Error,
			metadata: { outcome, ...summary }
		})
	},

	/**
	 * Profile/token events
	 */
	profile: {
		created: (profileId: string, provider: string): CreateAuditLogInput => ({
			actionType: AuditLogActionType.DataModification,
			actionDescription: `Profile created for ${provider}`,
			targetResourceType: AuditLogTargetResourceType.Profile,
			targetResourceId: profileId,
			outcome: AuditLogOutcome.Success,
			severity: AuditLogSeverity.Info,
			metadata: { provider }
		}),

		updated: (profileId: string, fields: string[]): CreateAuditLogInput => ({
			actionType: AuditLogActionType.DataModification,
			actionDescription: `Profile updated: ${fields.join(', ')}`,
			targetResourceType: AuditLogTargetResourceType.Profile,
			targetResourceId: profileId,
			outcome: AuditLogOutcome.Success,
			severity: AuditLogSeverity.Info,
			metadata: { updatedFields: fields }
		})
	},

	/**
	 * Token events
	 */
	token: {
		created: (profileId: string, provider: string): CreateAuditLogInput => ({
			actionType: AuditLogActionType.Integration,
			actionDescription: `Token created for ${provider}`,
			targetResourceType: AuditLogTargetResourceType.Token,
			outcome: AuditLogOutcome.Success,
			severity: AuditLogSeverity.Info,
			metadata: { profileId, provider }
		}),

		refreshed: (profileId: string, provider: string): CreateAuditLogInput => ({
			actionType: AuditLogActionType.Integration,
			actionDescription: `Token refreshed for ${provider}`,
			targetResourceType: AuditLogTargetResourceType.Token,
			outcome: AuditLogOutcome.Success,
			severity: AuditLogSeverity.Debug,
			metadata: { profileId, provider }
		}),

		refreshFailed: (profileId: string, provider: string, reason: string): CreateAuditLogInput => ({
			actionType: AuditLogActionType.Integration,
			actionDescription: `Token refresh failed for ${provider}: ${reason}`,
			targetResourceType: AuditLogTargetResourceType.Token,
			outcome: AuditLogOutcome.Failure,
			severity: AuditLogSeverity.Error,
			metadata: { profileId, provider, reason }
		})
	},

	/**
	 * Administration events
	 */
	admin: {
		viewedAuditLogs: (filters: Record<string, unknown>): CreateAuditLogInput => ({
			actionType: AuditLogActionType.Administration,
			actionDescription: 'Viewed system audit logs',
			targetResourceType: AuditLogTargetResourceType.AuditLog,
			outcome: AuditLogOutcome.Success,
			severity: AuditLogSeverity.Info,
			metadata: { filters }
		})
	}
}
