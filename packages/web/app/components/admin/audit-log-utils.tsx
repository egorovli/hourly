import type { AuditLogOutcome, AuditLogSeverity } from '~/domain/index.ts'

import { DateTime } from 'luxon'
import { AlertCircleIcon, CheckCircle2Icon, ClockIcon } from 'lucide-react'

import { Badge } from '~/components/shadcn/ui/badge.tsx'

/**
 * Default page size for audit log pagination.
 */
export const AUDIT_LOG_DEFAULT_PAGE_SIZE = 20

/**
 * Maximum page size for audit log pagination.
 */
export const AUDIT_LOG_MAX_PAGE_SIZE = 100

/**
 * Maximum number of events to display in an expanded correlation group.
 */
export const AUDIT_LOG_MAX_VISIBLE_EVENTS = 10

/**
 * Format an ISO date string as "LLL dd, yyyy" (e.g., "Jan 21, 2026").
 */
export function formatDate(isoString: string): string {
	return DateTime.fromISO(isoString).toFormat('LLL dd, yyyy')
}

/**
 * Format an ISO date string as a relative time (e.g., "2 hours ago").
 */
export function formatRelativeTime(isoString: string): string {
	const dt = DateTime.fromISO(isoString)
	return dt.toRelative() ?? formatDate(isoString)
}

/**
 * Format an ISO date string as a time only (e.g., "14:30:45").
 */
export function formatTime(isoString: string): string {
	return DateTime.fromISO(isoString).toFormat('HH:mm:ss')
}

/**
 * Get initials from a name or email for avatar fallback.
 */
export function getInitials(name: string | undefined, email: string | undefined): string {
	const source = name ?? email ?? '?'
	const parts = source.split(/[\s@]+/).filter(p => p.length > 0)

	if (parts.length >= 2) {
		const first = parts[0]
		const second = parts[1]

		if (first && first.length > 0 && second && second.length > 0) {
			return (first.charAt(0) + second.charAt(0)).toUpperCase()
		}
	}

	return source.slice(0, 2).toUpperCase()
}

/**
 * Icon component that displays the appropriate icon for an audit log outcome.
 */
export function OutcomeIcon({ outcome }: { outcome: AuditLogOutcome }): React.ReactNode {
	switch (outcome) {
		case 'success':
			return <CheckCircle2Icon className='size-4 text-green-600' />
		case 'failure':
			return <AlertCircleIcon className='size-4 text-destructive' />
		case 'pending':
			return <ClockIcon className='size-4 text-amber-500' />
		default:
			return null
	}
}

/**
 * Badge component that displays a formatted action type label.
 */
export function ActionTypeBadge({ actionType }: { actionType: string }): React.ReactNode {
	const label = actionType
		.split('-')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')

	return (
		<Badge
			variant='secondary'
			className='font-normal'
		>
			{label}
		</Badge>
	)
}

const severityVariantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
	debug: 'outline',
	info: 'secondary',
	warning: 'default',
	error: 'destructive',
	critical: 'destructive'
}

/**
 * Badge component that displays the severity level with appropriate styling.
 */
export function SeverityBadge({ severity }: { severity: AuditLogSeverity }): React.ReactNode {
	const variant = severityVariantMap[severity] ?? 'outline'

	return (
		<Badge
			variant={variant}
			className='font-normal text-[10px] px-1 py-0'
		>
			{severity}
		</Badge>
	)
}

/**
 * Badge component that displays the OAuth provider with appropriate styling.
 */
export function ProviderBadge({ provider }: { provider?: string }): React.ReactNode {
	if (!provider) {
		return (
			<Badge
				variant='outline'
				className='font-normal text-[10px] px-1 py-0'
			>
				anonymous
			</Badge>
		)
	}

	const variant = provider === 'atlassian' ? 'default' : 'secondary'

	return (
		<Badge
			variant={variant}
			className='font-normal text-[10px] px-1 py-0'
		>
			{provider}
		</Badge>
	)
}
