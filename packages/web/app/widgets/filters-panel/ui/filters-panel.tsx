import { Skeleton } from '~/components/shadcn/ui/skeleton.tsx'
import { ErrorPlaceholder } from '~/shared/ui/error-placeholder.tsx'
import { DateRangeFilter } from '~/features/select-date-range/index.ts'
import { JiraProjectsSelector } from '~/features/select-jira-projects/index.ts'
import { JiraUsersSelector } from '~/features/select-jira-users/index.ts'
import { GitlabProjectsSelector } from '~/features/select-gitlab-projects/index.ts'
import { GitlabContributorsSelector } from '~/features/select-gitlab-contributors/index.ts'
import { FilterSection } from './filter-section.tsx'
import { FilterDependencyMessage } from './filter-dependency-message.tsx'
import type { FiltersPanelProps } from '../model/types.ts'

export function FiltersPanel({
	dateRange,
	onDateRangeChange,
	jiraProjectsQuery,
	selectedJiraProjectIds,
	onJiraProjectIdsChange,
	jiraUsersQuery,
	selectedJiraUserIds,
	onJiraUserIdsChange,
	gitlabProjectsQuery,
	selectedGitlabProjectIds,
	onGitlabProjectIdsChange,
	gitlabContributorsQuery,
	selectedGitlabContributorIds,
	onGitlabContributorIdsChange,
	hasJiraProjectsSelected,
	hasGitlabProjectsSelected,
	hasCompleteDateRange
}: FiltersPanelProps): React.ReactNode {
	return (
		<div className='flex flex-col gap-6 pb-4 border-b'>
			<FilterSection
				title='Date range'
				description='Independent range shared by Jira worklogs and GitLab contributors.'
				dependencyHint='Standalone'
			>
				<DateRangeFilter
					value={dateRange}
					onChange={onDateRangeChange}
				/>
			</FilterSection>

			<div className='flex flex-col xl:flex-row gap-6'>
				<div className='grow basis-2/5'>
					<FilterSection
						title='Jira'
						description='Pick projects first, then load users to pull worklogs.'
						dependencyHint='Projects -> Users'
					>
						{jiraProjectsQuery.isLoading ? (
							<Skeleton className='h-9 w-32 rounded-md' />
						) : jiraProjectsQuery.error ? (
							<ErrorPlaceholder
								message={`Projects error: ${
									jiraProjectsQuery.error instanceof Error
										? jiraProjectsQuery.error.message
										: 'Unknown error'
								}`}
							/>
						) : jiraProjectsQuery.data ? (
							<JiraProjectsSelector
								data={jiraProjectsQuery.data}
								value={selectedJiraProjectIds}
								onChange={onJiraProjectIdsChange}
							/>
						) : null}

						{hasJiraProjectsSelected ? (
							jiraUsersQuery.isLoading ? (
								<Skeleton className='h-9 w-32 rounded-md' />
							) : jiraUsersQuery.error ? (
								<ErrorPlaceholder
									message={`Users error: ${
										jiraUsersQuery.error instanceof Error
											? jiraUsersQuery.error.message
											: 'Unknown error'
									}`}
								/>
							) : jiraUsersQuery.data ? (
								<JiraUsersSelector
									data={jiraUsersQuery.data}
									value={selectedJiraUserIds}
									onChange={onJiraUserIdsChange}
								/>
							) : null
						) : (
							<FilterDependencyMessage>Select Jira projects to load users</FilterDependencyMessage>
						)}
					</FilterSection>
				</div>

				<div className='grow basis-3/5'>
					<FilterSection
						title='GitLab'
						description='Contributors become available after selecting projects and a date range.'
						dependencyHint='Projects + Date range -> Contributors'
					>
						{gitlabProjectsQuery.isLoading ? (
							<Skeleton className='h-9 w-32 rounded-md' />
						) : gitlabProjectsQuery.error ? (
							<ErrorPlaceholder
								message={`GitLab projects error: ${
									gitlabProjectsQuery.error instanceof Error
										? gitlabProjectsQuery.error.message
										: 'Unknown error'
								}`}
							/>
						) : gitlabProjectsQuery.data ? (
							<GitlabProjectsSelector
								data={gitlabProjectsQuery.data}
								value={selectedGitlabProjectIds}
								onChange={onGitlabProjectIdsChange}
							/>
						) : null}

						{hasGitlabProjectsSelected ? (
							hasCompleteDateRange ? (
								gitlabContributorsQuery.isLoading ? (
									<Skeleton className='h-9 w-48 rounded-md' />
								) : gitlabContributorsQuery.error ? (
									<ErrorPlaceholder
										message={`GitLab contributors error: ${
											gitlabContributorsQuery.error instanceof Error
												? gitlabContributorsQuery.error.message
												: 'Unknown error'
										}`}
									/>
								) : gitlabContributorsQuery.data ? (
									<GitlabContributorsSelector
										data={gitlabContributorsQuery.data}
										value={selectedGitlabContributorIds}
										onChange={onGitlabContributorIdsChange}
									/>
								) : null
							) : (
								<FilterDependencyMessage>
									Select a date range to load contributors
								</FilterDependencyMessage>
							)
						) : (
							<FilterDependencyMessage>
								Select GitLab projects to load contributors
							</FilterDependencyMessage>
						)}
					</FilterSection>
				</div>
			</div>
		</div>
	)
}
