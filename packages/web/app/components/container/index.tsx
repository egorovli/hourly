import { cn } from '~/lib/cn/index.ts'

export interface ContainerProps extends React.ComponentProps<'div'> {}

export function Container({ children, className, ...rest }: ContainerProps): React.ReactNode {
	return (
		<div
			className={cn('max-w-7xl w-full mx-auto', className)}
			{...rest}
		>
			{children}
		</div>
	)
}
