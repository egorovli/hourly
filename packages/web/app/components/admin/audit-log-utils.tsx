import type { AuditLogOutcome, AuditLogSeverity } from '~/domain/index.ts'

import { DateTime } from 'luxon'
import { AlertCircleIcon, CheckCircle2Icon, ClockIcon } from 'lucide-react'

import { Badge } from '~/components/shadcn/ui/badge.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger
} from '~/components/shadcn/ui/tooltip.tsx'
import { cn } from '~/lib/util/index.ts'

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

const severityStyles: Record<AuditLogSeverity, string> = {
	debug: 'bg-slate-100 text-slate-600 border-slate-200',
	info: 'bg-blue-50 text-blue-700 border-blue-200',
	warning: 'bg-amber-50 text-amber-700 border-amber-200',
	error: 'bg-red-50 text-red-700 border-red-200',
	critical: 'bg-red-100 text-red-800 border-red-300'
}

interface SeverityBadgeProps {
	severity: AuditLogSeverity
	showTooltip?: boolean
}

/**
 * Badge component that displays the severity level with appropriate styling.
 * Optionally shows a tooltip with the severity description.
 */
export function SeverityBadge({
	severity,
	showTooltip = false
}: SeverityBadgeProps): React.ReactNode {
	const styles = severityStyles[severity] ?? severityStyles.info
	const label = severity.charAt(0).toUpperCase() + severity.slice(1)

	const badge = (
		<Badge
			variant='outline'
			className={cn('font-medium font-mono text-[10px] px-1.5 py-0 uppercase', styles)}
		>
			{label}
		</Badge>
	)

	if (showTooltip) {
		return (
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>{badge}</TooltipTrigger>
					<TooltipContent>
						<span className='text-xs'>{severityDescriptions[severity]}</span>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		)
	}

	return badge
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

/**
 * Duration formatting result with speed classification.
 */
export type DurationVariant = 'fast' | 'normal' | 'slow'

/**
 * Format duration in milliseconds with color variant classification.
 * Fast: <100ms, Normal: 100-500ms, Slow: >500ms
 */
export function formatDuration(ms: number | undefined): { text: string; variant: DurationVariant } {
	if (ms === undefined) {
		return { text: '—', variant: 'normal' }
	}

	let text: string
	if (ms < 1000) {
		text = `${ms}ms`
	} else if (ms < 60000) {
		text = `${(ms / 1000).toFixed(1)}s`
	} else {
		const minutes = Math.floor(ms / 60000)
		const seconds = Math.round((ms % 60000) / 1000)
		text = seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
	}

	let variant: DurationVariant
	if (ms < 100) {
		variant = 'fast'
	} else if (ms <= 500) {
		variant = 'normal'
	} else {
		variant = 'slow'
	}

	return { text, variant }
}

const durationVariantStyles: Record<DurationVariant, string> = {
	fast: 'text-green-600 bg-green-50 border-green-200',
	normal: 'text-amber-600 bg-amber-50 border-amber-200',
	slow: 'text-red-600 bg-red-50 border-red-200'
}

/**
 * Badge component that displays duration with color coding based on speed.
 */
export function DurationBadge({ ms }: { ms: number | undefined }): React.ReactNode {
	const { text, variant } = formatDuration(ms)

	if (ms === undefined) {
		return <span className='text-sm text-muted-foreground'>—</span>
	}

	return (
		<Badge
			variant='outline'
			className={cn('font-mono text-[10px] px-1.5 py-0', durationVariantStyles[variant])}
		>
			{text}
		</Badge>
	)
}

/**
 * Visual bar representing duration relative to max of 1 second.
 */
export function DurationBar({ ms }: { ms: number }): React.ReactNode {
	const { variant } = formatDuration(ms)
	// Cap at 1 second for visual representation
	const percentage = Math.min((ms / 1000) * 100, 100)

	const barStyles: Record<DurationVariant, string> = {
		fast: 'bg-green-500',
		normal: 'bg-amber-500',
		slow: 'bg-red-500'
	}

	return (
		<div className='h-1.5 w-20 rounded-full bg-muted overflow-hidden'>
			<div
				className={cn('h-full rounded-full transition-all', barStyles[variant])}
				style={{ width: `${percentage}%` }}
			/>
		</div>
	)
}

const httpMethodStyles: Record<string, string> = {
	GET: 'text-blue-600 bg-blue-50 border-blue-200',
	POST: 'text-green-600 bg-green-50 border-green-200',
	PUT: 'text-amber-600 bg-amber-50 border-amber-200',
	DELETE: 'text-red-600 bg-red-50 border-red-200',
	PATCH: 'text-purple-600 bg-purple-50 border-purple-200'
}

/**
 * Badge component that displays HTTP method with color coding.
 */
export function HttpMethodBadge({ method }: { method: string }): React.ReactNode {
	const normalizedMethod = method.toUpperCase()
	const styles = httpMethodStyles[normalizedMethod] ?? 'text-gray-600 bg-gray-50 border-gray-200'

	return (
		<Badge
			variant='outline'
			className={cn('font-mono text-[10px] px-1.5 py-0 font-medium', styles)}
		>
			{normalizedMethod}
		</Badge>
	)
}

/**
 * Parsed user agent information.
 */
export interface ParsedUserAgent {
	browser: string
	os: string
	full: string
}

/**
 * Browser detection patterns with corresponding name and version regex.
 */
const browserPatterns: Array<{ test: string; name: string; versionPattern?: RegExp }> = [
	{ test: 'Firefox/', name: 'Firefox', versionPattern: /Firefox\/(\d+)/ },
	{ test: 'Edg/', name: 'Edge', versionPattern: /Edg\/(\d+)/ },
	{ test: 'Chrome/', name: 'Chrome', versionPattern: /Chrome\/(\d+)/ },
	{ test: 'curl/', name: 'curl' },
	{ test: 'node', name: 'Node.js' }
]

function detectBrowser(ua: string): string {
	// Safari detection requires special handling (must not contain Chrome)
	if (ua.includes('Safari/') && !ua.includes('Chrome')) {
		const match = ua.match(/Version\/(\d+)/)
		return match?.[1] ? `Safari ${match[1]}` : 'Safari'
	}

	for (const pattern of browserPatterns) {
		if (ua.includes(pattern.test)) {
			if (pattern.versionPattern) {
				const match = ua.match(pattern.versionPattern)
				return match?.[1] ? `${pattern.name} ${match[1]}` : pattern.name
			}
			return pattern.name
		}
	}

	return 'Unknown'
}

function detectOS(ua: string): string {
	if (ua.includes('Windows NT 10')) {
		return 'Windows 10+'
	}
	if (ua.includes('Windows')) {
		return 'Windows'
	}

	if (ua.includes('Mac OS X')) {
		const match = ua.match(/Mac OS X (\d+[._]\d+)/)
		return match?.[1] ? `macOS ${match[1].replace('_', '.')}` : 'macOS'
	}

	if (ua.includes('Linux')) {
		return 'Linux'
	}

	if (ua.includes('Android')) {
		const match = ua.match(/Android (\d+)/)
		return match?.[1] ? `Android ${match[1]}` : 'Android'
	}

	if (ua.includes('iPhone') || ua.includes('iPad')) {
		const match = ua.match(/OS (\d+)/)
		return match?.[1] ? `iOS ${match[1]}` : 'iOS'
	}

	return 'Unknown'
}

/**
 * Parse user agent string into browser and OS components.
 */
export function parseUserAgent(ua: string | undefined): ParsedUserAgent {
	if (!ua) {
		return { browser: 'Unknown', os: 'Unknown', full: '' }
	}

	return {
		browser: detectBrowser(ua),
		os: detectOS(ua),
		full: ua
	}
}

/**
 * Truncate a UUID or long string for display purposes.
 */
export function truncateUuid(uuid: string, chars = 8): string {
	if (uuid.length <= chars * 2 + 3) {
		return uuid
	}
	return `${uuid.slice(0, chars)}...${uuid.slice(-chars)}`
}

/**
 * Severity level descriptions for user-friendly explanations.
 */
export const severityDescriptions: Record<AuditLogSeverity, string> = {
	debug: 'Detailed diagnostic information for troubleshooting',
	info: 'Normal operational events that require no action',
	warning: 'Potentially harmful situations that should be monitored',
	error: 'Error events that might still allow the application to continue',
	critical: 'Severe errors requiring immediate attention'
}
