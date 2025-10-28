import { Progress } from '~/shared/ui/shadcn/ui/progress.tsx'
import { cn } from '~/lib/util/index.ts'

interface AutoLoadProgressProps {
	isLoading: boolean
	pagesLoaded: number
	totalPages: number | null
	progressPercent: number | null
	className?: string
}

/**
 * Subtle progress indicator for auto-loading infinite queries.
 * Uses shadcn Progress component with indeterminate state support.
 */
export function AutoLoadProgress({
	isLoading,
	pagesLoaded,
	totalPages,
	progressPercent,
	className
}: AutoLoadProgressProps): React.ReactNode {
	if (!isLoading) {
		return null
	}

	const hasKnownProgress = totalPages !== null && progressPercent !== null

	return (
		<div className={cn('flex flex-col gap-1', className)}>
			<Progress
				value={hasKnownProgress ? progressPercent : undefined}
				className={cn('h-1 w-full', !hasKnownProgress && 'progress-indeterminate')}
			/>
			<div className='flex items-center gap-1.5 text-[10px] text-muted-foreground/70'>
				<span className='font-medium'>
					{hasKnownProgress
						? `${pagesLoaded} / ${totalPages} pages (${progressPercent}%)`
						: `Loading... ${pagesLoaded} pages so far`}
				</span>
			</div>
		</div>
	)
}
