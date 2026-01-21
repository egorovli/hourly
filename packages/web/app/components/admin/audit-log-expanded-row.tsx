import type { AuditLogEntry } from '~/domain/index.ts'

import { EyeIcon, GitBranchIcon, GlobeIcon } from 'lucide-react'

import { CopyableField } from '~/components/admin/audit-log-copyable-field.tsx'
import {
	DurationBar,
	DurationBadge,
	HttpMethodBadge,
	parseUserAgent
} from '~/components/admin/audit-log-utils.tsx'
import { Button } from '~/components/shadcn/ui/button.tsx'

export interface AuditLogExpandedRowProps {
	entry: AuditLogEntry
	onViewDetails: () => void
	colspan: number
}

/**
 * Inline expandable panel showing Tier 2 details:
 * - Request context (method, path, IP, user agent, duration)
 * - Correlation IDs (request, session, correlation)
 * - Button to open full detail sheet
 */
export function AuditLogExpandedRow({
	entry,
	onViewDetails,
	colspan
}: AuditLogExpandedRowProps): React.ReactNode {
	const parsedUA = parseUserAgent(entry.userAgent)

	return (
		<tr>
			<td
				colSpan={colspan}
				className='px-4 py-3 bg-muted/30 border-b'
			>
				<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
					{/* Request Context */}
					<div className='space-y-3'>
						<div className='flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground'>
							<GlobeIcon className='size-3.5' />
							Request Context
						</div>

						<div className='space-y-2'>
							<div className='flex items-center gap-2'>
								<HttpMethodBadge method={entry.requestMethod} />
								<code className='font-mono text-xs bg-background px-2 py-1 rounded border truncate max-w-[300px]'>
									{entry.requestPath}
								</code>
							</div>

							{entry.ipAddress && (
								<div className='flex items-center gap-2'>
									<span className='text-xs text-muted-foreground w-20'>IP Address</span>
									<CopyableField
										value={entry.ipAddress}
										label='IP Address'
										truncate={false}
									/>
								</div>
							)}

							{entry.userAgent && (
								<div className='flex items-center gap-2'>
									<span className='text-xs text-muted-foreground w-20'>User Agent</span>
									<span className='text-xs'>
										{parsedUA.browser} on {parsedUA.os}
									</span>
								</div>
							)}

							<div className='flex items-center gap-2'>
								<span className='text-xs text-muted-foreground w-20'>Duration</span>
								<div className='flex items-center gap-2'>
									<DurationBadge ms={entry.durationMs} />
									{entry.durationMs !== undefined && <DurationBar ms={entry.durationMs} />}
								</div>
							</div>
						</div>
					</div>

					{/* Correlation */}
					<div className='space-y-3'>
						<div className='flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground'>
							<GitBranchIcon className='size-3.5' />
							Correlation
						</div>

						<div className='space-y-2'>
							<div className='flex items-center gap-2'>
								<span className='text-xs text-muted-foreground w-24'>Request ID</span>
								<CopyableField
									value={entry.requestId}
									label='Request ID'
								/>
							</div>

							<div className='flex items-center gap-2'>
								<span className='text-xs text-muted-foreground w-24'>Correlation ID</span>
								<CopyableField
									value={entry.correlationId}
									label='Correlation ID'
								/>
							</div>

							{entry.sessionId && (
								<div className='flex items-center gap-2'>
									<span className='text-xs text-muted-foreground w-24'>Session ID</span>
									<CopyableField
										value={entry.sessionId}
										label='Session ID'
									/>
								</div>
							)}
						</div>

						<Button
							variant='outline'
							size='sm'
							className='mt-2'
							onClick={e => {
								e.stopPropagation()
								onViewDetails()
							}}
						>
							<EyeIcon className='size-4 mr-1' />
							View Full Details
						</Button>
					</div>
				</div>
			</td>
		</tr>
	)
}
