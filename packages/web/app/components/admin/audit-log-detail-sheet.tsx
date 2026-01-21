import type { AuditLogEntry, ResolvedActor } from '~/domain/index.ts'

import { useCallback, useState } from 'react'
import {
	BracesIcon,
	CheckIcon,
	ChevronDownIcon,
	CopyIcon,
	GitBranchIcon,
	GlobeIcon,
	MonitorIcon,
	UserIcon
} from 'lucide-react'
import { toast } from 'sonner'

import { CopyableField } from '~/components/admin/audit-log-copyable-field.tsx'
import {
	ActionTypeBadge,
	DurationBar,
	DurationBadge,
	formatDate,
	formatRelativeTime,
	getInitials,
	HttpMethodBadge,
	OutcomeIcon,
	parseUserAgent,
	ProviderBadge,
	severityDescriptions,
	SeverityBadge
} from '~/components/admin/audit-log-utils.tsx'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/shadcn/ui/avatar.tsx'
import { Button } from '~/components/shadcn/ui/button.tsx'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from '~/components/shadcn/ui/collapsible.tsx'
import { ScrollArea } from '~/components/shadcn/ui/scroll-area.tsx'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle
} from '~/components/shadcn/ui/sheet.tsx'
import { cn } from '~/lib/util/index.ts'

export interface AuditLogDetailSheetProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	entry: AuditLogEntry | undefined
	actor: ResolvedActor | undefined
	isMobile: boolean
}

/**
 * Full detail side sheet for Tier 3 inspection of an audit log entry.
 * Displays all available fields in organized sections.
 */
export function AuditLogDetailSheet({
	open,
	onOpenChange,
	entry,
	actor,
	isMobile
}: AuditLogDetailSheetProps): React.ReactNode {
	if (!entry) {
		return null
	}

	const displayName = actor?.displayName ?? actor?.email ?? entry.actorProfileId ?? 'Anonymous'
	const initials = getInitials(actor?.displayName, actor?.email)
	const parsedUA = parseUserAgent(entry.userAgent)

	return (
		<Sheet
			open={open}
			onOpenChange={onOpenChange}
		>
			<SheetContent
				side={isMobile ? 'bottom' : 'right'}
				className={cn(
					isMobile && 'h-[90vh] max-h-[90vh] rounded-t-2xl',
					!isMobile && 'w-full sm:max-w-[480px]'
				)}
			>
				<SheetHeader>
					<div className='flex items-center gap-3'>
						<ActionTypeBadge actionType={entry.actionType} />
						<OutcomeIcon outcome={entry.outcome} />
						<span className='capitalize text-sm'>{entry.outcome}</span>
					</div>
					<SheetTitle className='flex flex-col gap-1'>
						<span>{entry.actionDescription}</span>
					</SheetTitle>
					<SheetDescription>
						{formatDate(entry.occurredAt)} ({formatRelativeTime(entry.occurredAt)})
					</SheetDescription>
				</SheetHeader>

				<ScrollArea className='flex-1 -mx-4 px-4'>
					<div className='flex flex-col gap-4 pb-4'>
						{/* Actor Section */}
						<DetailSection
							title='Actor'
							icon={<UserIcon className='size-4' />}
						>
							<div className='flex items-center gap-3'>
								<Avatar className='size-12'>
									<AvatarImage
										src={actor?.avatarUrl}
										alt={displayName}
									/>
									<AvatarFallback>{initials}</AvatarFallback>
								</Avatar>
								<div className='flex flex-col gap-1'>
									<span className='font-medium'>{displayName}</span>
									{actor?.email && (
										<span className='text-xs text-muted-foreground'>{actor.email}</span>
									)}
									<ProviderBadge provider={entry.actorProvider} />
								</div>
							</div>
							{entry.actorProfileId && (
								<DetailRow label='Profile ID'>
									<CopyableField
										value={entry.actorProfileId}
										label='Profile ID'
									/>
								</DetailRow>
							)}
						</DetailSection>

						{/* Action Section */}
						<DetailSection
							title='Action'
							icon={<MonitorIcon className='size-4' />}
						>
							<DetailRow label='Type'>
								<ActionTypeBadge actionType={entry.actionType} />
							</DetailRow>
							<DetailRow label='Severity'>
								<div className='flex flex-col gap-1'>
									<SeverityBadge severity={entry.severity} />
									<span className='text-xs text-muted-foreground'>
										{severityDescriptions[entry.severity]}
									</span>
								</div>
							</DetailRow>
							<DetailRow label='Description'>
								<span className='text-sm'>{entry.actionDescription}</span>
							</DetailRow>
						</DetailSection>

						{/* Target Section */}
						<DetailSection
							title='Target'
							icon={<GlobeIcon className='size-4' />}
						>
							<DetailRow label='Resource Type'>
								<span className='capitalize text-sm'>
									{entry.targetResourceType.replace('-', ' ')}
								</span>
							</DetailRow>
							{entry.targetResourceId && (
								<DetailRow label='Resource ID'>
									<CopyableField
										value={entry.targetResourceId}
										label='Resource ID'
									/>
								</DetailRow>
							)}
						</DetailSection>

						{/* Request Context Section */}
						<DetailSection
							title='Request Context'
							icon={<GlobeIcon className='size-4' />}
						>
							<DetailRow label='Request'>
								<div className='flex items-center gap-2'>
									<HttpMethodBadge method={entry.requestMethod} />
									<code className='font-mono text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-[200px]'>
										{entry.requestPath}
									</code>
								</div>
							</DetailRow>
							{entry.ipAddress && (
								<DetailRow label='IP Address'>
									<CopyableField
										value={entry.ipAddress}
										label='IP Address'
										truncate={false}
									/>
								</DetailRow>
							)}
							{entry.userAgent && (
								<DetailRow label='User Agent'>
									<div className='flex flex-col gap-1'>
										<span className='text-sm'>
											{parsedUA.browser} on {parsedUA.os}
										</span>
										<code className='font-mono text-[10px] text-muted-foreground break-all'>
											{parsedUA.full}
										</code>
									</div>
								</DetailRow>
							)}
							<DetailRow label='Duration'>
								<div className='flex items-center gap-3'>
									<DurationBadge ms={entry.durationMs} />
									{entry.durationMs !== undefined && <DurationBar ms={entry.durationMs} />}
								</div>
							</DetailRow>
						</DetailSection>

						{/* Correlation Section */}
						<DetailSection
							title='Correlation'
							icon={<GitBranchIcon className='size-4' />}
						>
							<DetailRow label='Request ID'>
								<CopyableField
									value={entry.requestId}
									label='Request ID'
								/>
							</DetailRow>
							<DetailRow label='Correlation ID'>
								<CopyableField
									value={entry.correlationId}
									label='Correlation ID'
								/>
							</DetailRow>
							{entry.sessionId && (
								<DetailRow label='Session ID'>
									<CopyableField
										value={entry.sessionId}
										label='Session ID'
									/>
								</DetailRow>
							)}
							{entry.sequenceNumber !== undefined && (
								<DetailRow label='Sequence'>
									<span className='text-sm font-mono'>#{entry.sequenceNumber}</span>
								</DetailRow>
							)}
							{entry.parentEventId && (
								<DetailRow label='Parent Event'>
									<CopyableField
										value={entry.parentEventId}
										label='Parent Event ID'
									/>
								</DetailRow>
							)}
						</DetailSection>

						{/* Metadata Section */}
						{entry.metadata && Object.keys(entry.metadata).length > 0 && (
							<MetadataSection metadata={entry.metadata} />
						)}
					</div>
				</ScrollArea>
			</SheetContent>
		</Sheet>
	)
}

interface DetailSectionProps {
	title: string
	icon: React.ReactNode
	children: React.ReactNode
}

function DetailSection({ title, icon, children }: DetailSectionProps): React.ReactNode {
	return (
		<div className='rounded-lg border bg-card'>
			<div className='flex items-center gap-2 px-4 py-3 border-b bg-muted/30'>
				{icon}
				<span className='font-medium text-sm'>{title}</span>
			</div>
			<div className='p-4 flex flex-col gap-3'>{children}</div>
		</div>
	)
}

interface DetailRowProps {
	label: string
	children: React.ReactNode
}

function DetailRow({ label, children }: DetailRowProps): React.ReactNode {
	return (
		<div className='flex flex-col gap-1'>
			<span className='text-xs text-muted-foreground font-medium uppercase tracking-wider'>
				{label}
			</span>
			{children}
		</div>
	)
}

interface MetadataSectionProps {
	metadata: Record<string, unknown>
}

function MetadataSection({ metadata }: MetadataSectionProps): React.ReactNode {
	const [isOpen, setIsOpen] = useState(false)
	const [copied, setCopied] = useState(false)

	const jsonString = JSON.stringify(metadata, null, 2)

	const handleCopyAll = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(jsonString)
			setCopied(true)
			toast.success('Metadata copied to clipboard')
			setTimeout(() => setCopied(false), 2000)
		} catch {
			toast.error('Failed to copy metadata')
		}
	}, [jsonString])

	return (
		<Collapsible
			open={isOpen}
			onOpenChange={setIsOpen}
		>
			<div className='rounded-lg border bg-card'>
				<CollapsibleTrigger asChild>
					<button
						type='button'
						className='flex items-center justify-between w-full px-4 py-3 hover:bg-muted/30 transition-colors'
					>
						<div className='flex items-center gap-2'>
							<BracesIcon className='size-4' />
							<span className='font-medium text-sm'>Metadata</span>
							<span className='text-xs text-muted-foreground'>
								({Object.keys(metadata).length}{' '}
								{Object.keys(metadata).length === 1 ? 'key' : 'keys'})
							</span>
						</div>
						<ChevronDownIcon
							className={cn(
								'size-4 text-muted-foreground transition-transform',
								isOpen && 'rotate-180'
							)}
						/>
					</button>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div className='border-t'>
						<div className='flex justify-end p-2 border-b bg-muted/20'>
							<Button
								variant='ghost'
								size='sm'
								onClick={e => {
									e.stopPropagation()
									void handleCopyAll()
								}}
							>
								{copied ? (
									<CheckIcon className='size-3 mr-1 text-green-600' />
								) : (
									<CopyIcon className='size-3 mr-1' />
								)}
								Copy All
							</Button>
						</div>
						<div className='p-4 overflow-auto max-h-[300px]'>
							<JsonTree data={metadata} />
						</div>
					</div>
				</CollapsibleContent>
			</div>
		</Collapsible>
	)
}

interface JsonTreeProps {
	data: unknown
	depth?: number
}

function JsonTree({ data, depth = 0 }: JsonTreeProps): React.ReactNode {
	if (data === null) {
		return <span className='text-orange-600'>null</span>
	}

	if (typeof data === 'undefined') {
		return <span className='text-gray-400'>undefined</span>
	}

	if (typeof data === 'boolean') {
		return <span className='text-purple-600'>{data.toString()}</span>
	}

	if (typeof data === 'number') {
		return <span className='text-blue-600'>{data}</span>
	}

	if (typeof data === 'string') {
		return <span className='text-green-600'>"{data}"</span>
	}

	if (Array.isArray(data)) {
		if (data.length === 0) {
			return <span className='text-muted-foreground'>[]</span>
		}

		return (
			<div className='font-mono text-xs'>
				<span className='text-muted-foreground'>[</span>
				<div className='ml-4'>
					{data.map((item, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: JSON arrays have no stable identity for keys
						<div key={`array-item-${depth}-${index}`}>
							<JsonTree
								data={item}
								depth={depth + 1}
							/>
							{index < data.length - 1 && <span className='text-muted-foreground'>,</span>}
						</div>
					))}
				</div>
				<span className='text-muted-foreground'>]</span>
			</div>
		)
	}

	if (typeof data === 'object') {
		const entries = Object.entries(data)
		if (entries.length === 0) {
			return <span className='text-muted-foreground'>&#123;&#125;</span>
		}

		return (
			<div className='font-mono text-xs'>
				<span className='text-muted-foreground'>&#123;</span>
				<div className='ml-4'>
					{entries.map(([key, value], index) => (
						<div key={key}>
							<span className='text-rose-600'>"{key}"</span>
							<span className='text-muted-foreground'>: </span>
							<JsonTree
								data={value}
								depth={depth + 1}
							/>
							{index < entries.length - 1 && <span className='text-muted-foreground'>,</span>}
						</div>
					))}
				</div>
				<span className='text-muted-foreground'>&#125;</span>
			</div>
		)
	}

	return <span className='text-muted-foreground'>{String(data)}</span>
}
