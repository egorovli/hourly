import type React from 'react'
import type { CSSProperties } from 'react'
import { useFetcher } from 'react-router'

import { Theme } from '~/domain/preferences.ts'

interface ThemeOption {
	value: Theme
	label: string
}

const THEME_OPTIONS: ThemeOption[] = [
	{ value: Theme.Light, label: 'Light' },
	{ value: Theme.Dark, label: 'Dark' },
	{ value: Theme.System, label: 'System' }
]

export interface ThemeSwitcherProps {
	value?: Theme
	className?: string
}

const formStyle: CSSProperties = {
	display: 'flex',
	flexDirection: 'column',
	gap: '0.75rem'
}

const fieldsetStyle: CSSProperties = {
	border: '1px solid currentColor',
	borderRadius: '4px',
	padding: '1rem',
	display: 'flex',
	flexDirection: 'column',
	gap: '0.75rem'
}

const optionStyleBase: CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'space-between',
	gap: '0.75rem',
	border: '1px solid currentColor',
	borderRadius: '4px',
	padding: '0.75rem'
}

const optionTextStyle: CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	gap: '0.5rem'
}

function createOptionStyle(selected: boolean): CSSProperties {
	return {
		...optionStyleBase,
		borderWidth: selected ? '2px' : '1px',
		fontWeight: selected ? 600 : 500
	}
}

export function ThemeSwitcher({
	value = Theme.System,
	className
}: ThemeSwitcherProps): React.ReactNode {
	const fetcher = useFetcher()

	const optimisticSelection = fetcher.formData?.get('theme') as Theme | null
	const currentSelection = optimisticSelection ?? value
	const isBusy = fetcher.state !== 'idle'

	return (
		<fetcher.Form
			method='post'
			action='/preferences'
			className={className}
			style={formStyle}
			onChange={event => {
				fetcher.submit(event.currentTarget, {
					preventScrollReset: true
				})
			}}
		>
			<fieldset
				style={{
					...fieldsetStyle,
					opacity: isBusy ? 0.7 : 1
				}}
				aria-busy={isBusy}
			>
				<legend>Тема интерфейса</legend>

				{THEME_OPTIONS.map(option => (
					<label
						key={option.value}
						style={createOptionStyle(currentSelection === option.value)}
					>
						<span style={optionTextStyle}>
							<input
								type='radio'
								name='theme'
								value={option.value}
								defaultChecked={currentSelection === option.value}
							/>
							{option.label}
						</span>
						{currentSelection === option.value ? (
							<span style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Активна</span>
						) : null}
					</label>
				))}
			</fieldset>
		</fetcher.Form>
	)
}
