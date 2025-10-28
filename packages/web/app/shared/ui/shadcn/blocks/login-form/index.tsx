import { SiAtlassian, SiAtlassianHex, SiGitlab, SiGitlabHex } from '@icons-pack/react-simple-icons'
import { CheckCircle2, RefreshCw } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '~/shared/ui/shadcn/ui/button.tsx'
import { cn } from '~/lib/util/index.ts'

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '~/shared/ui/shadcn/ui/card.tsx'

import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldSeparator
} from '~/shared/ui/shadcn/ui/field.tsx'

import { Input } from '~/shared/ui/shadcn/ui/input.tsx'

interface LoginFormProps extends React.ComponentProps<'div'> {
	connectedProviders?: {
		atlassian: boolean
		gitlab: boolean
	}
}

export function LoginForm({ className, connectedProviders, ...props }: LoginFormProps) {
	return (
		<div
			className={cn('flex flex-col gap-6', 'color-', className)}
			{...props}
		>
			<Card>
				<CardHeader className='text-center'>
					<CardTitle className='text-xl'>Welcome back</CardTitle>
					<CardDescription>
						{connectedProviders?.atlassian || connectedProviders?.gitlab
							? 'Complete authentication with both providers'
							: 'Login with both Atlassian and GitLab'}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form>
						<FieldGroup>
							<Field>
								<Button
									variant={connectedProviders?.atlassian ? 'secondary' : 'outline'}
									type='button'
									asChild
									className='relative'
								>
									<Link to='/auth/atlassian/sign-in'>
										{connectedProviders?.atlassian ? (
											<>
												<CheckCircle2 className='text-green-600 size-4' />
												<span className='flex-1'>Reconnect Atlassian</span>
												<RefreshCw className='size-3 opacity-50' />
											</>
										) : (
											<>
												<SiAtlassian
													color={SiAtlassianHex}
													className='size-4'
												/>
												Login with Atlassian
											</>
										)}
									</Link>
								</Button>

								<Button
									variant={connectedProviders?.gitlab ? 'secondary' : 'outline'}
									type='button'
									asChild
									className='relative'
								>
									<Link to='/auth/gitlab/sign-in'>
										{connectedProviders?.gitlab ? (
											<>
												<CheckCircle2 className='text-green-600 size-4' />
												<span className='flex-1'>Reconnect GitLab</span>
												<RefreshCw className='size-3 opacity-50' />
											</>
										) : (
											<>
												<SiGitlab
													color={SiGitlabHex}
													className='size-4'
												/>
												Login with GitLab
											</>
										)}
									</Link>
								</Button>
							</Field>
							<FieldSeparator className='*:data-[slot=field-separator-content]:bg-card'>
								Or continue with
							</FieldSeparator>
							<Field>
								<FieldLabel htmlFor='email'>Email</FieldLabel>
								<Input
									id='email'
									type='email'
									placeholder='m@example.com'
									required={false}
									disabled
								/>
							</Field>
							<Field>
								<div className='flex items-center'>
									<FieldLabel htmlFor='password'>Password</FieldLabel>
									<Link
										to='#'
										className='ml-auto text-sm underline-offset-4 hover:underline'
									>
										Forgot your password?
									</Link>
								</div>
								<Input
									id='password'
									type='password'
									placeholder='********'
									required={false}
									disabled
								/>
							</Field>
							<Field>
								<Button
									disabled
									type='submit'
								>
									Login
								</Button>

								<FieldDescription className='text-center'>
									Don&apos;t have an account? <Link to='#'>Sign up</Link>
								</FieldDescription>
							</Field>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
			<FieldDescription className='px-6 text-center'>
				By clicking continue, you agree to our <Link to='#'>Terms of Service</Link> and{' '}
				<Link to='#'>Privacy Policy</Link>.
			</FieldDescription>
		</div>
	)
}
