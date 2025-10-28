export interface FilterDependencyMessageProps {
	children: React.ReactNode
}

export function FilterDependencyMessage({
	children
}: FilterDependencyMessageProps): React.ReactNode {
	return (
		<span className='rounded-md border border-dashed border-border px-3 py-1 text-xs text-muted-foreground'>
			{children}
		</span>
	)
}
