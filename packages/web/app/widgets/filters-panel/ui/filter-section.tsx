export interface FilterSectionProps {
	title: string
	description?: string
	dependencyHint?: string
	children: React.ReactNode
}

export function FilterSection({
	title,
	description,
	dependencyHint,
	children
}: FilterSectionProps): React.ReactNode {
	return (
		<section className='flex flex-col gap-2'>
			<div className='flex items-center gap-2'>
				<span className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
					{title}
				</span>
				{dependencyHint ? (
					<span className='rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
						{dependencyHint}
					</span>
				) : null}
			</div>
			{description ? <p className='text-xs text-muted-foreground'>{description}</p> : null}
			<div className='flex flex-wrap items-center gap-3'>{children}</div>
		</section>
	)
}
