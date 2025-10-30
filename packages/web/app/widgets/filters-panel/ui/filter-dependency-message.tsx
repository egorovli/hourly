export interface FilterDependencyMessageProps {
	children: React.ReactNode
}

export function FilterDependencyMessage({
	children
}: FilterDependencyMessageProps): React.ReactNode {
	return (
		<span className='rounded-sm border border-dashed border-border bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground'>
			{children}
		</span>
	)
}
