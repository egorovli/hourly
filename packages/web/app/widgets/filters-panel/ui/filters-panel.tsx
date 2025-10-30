import { Skeleton } from '~/shared/ui/shadcn/ui/skeleton.tsx'
import { ErrorPlaceholder } from '~/shared/ui/error-placeholder.tsx'
import { DateRangeFilter } from '~/features/select-date-range/index.ts'
import { JiraProjectsSelector } from '~/features/select-jira-projects/index.ts'
import { JiraUsersSelector } from '~/features/select-jira-users/index.ts'
import { GitlabProjectsSelector } from '~/features/select-gitlab-projects/index.ts'
import { GitlabContributorsSelector } from '~/features/select-gitlab-contributors/index.ts'
import { FilterSection } from './filter-section.tsx'
import { FilterDependencyMessage } from './filter-dependency-message.tsx'
import type { FiltersPanelProps } from '../model/types.ts'

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Conditional layout with multiple async states
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
		<div className='flex flex-col gap-8 pb-6 border-b'>
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

			<div className='flex flex-col xl:flex-row gap-8'>
				<div className='flex-1 xl:max-w-[45%]'>
					<FilterSection
						title='Jira'
						description={
							jiraProjectsQuery.isLoading || jiraProjectsQuery.isFetching
								? 'Loading Jira projects...'
								: jiraUsersQuery.isLoading || jiraUsersQuery.isFetching
									? 'Loading Jira users for selected projects...'
									: 'Pick projects first, then load users to pull worklogs.'
						}
						dependencyHint='Projects -> Users'
					>
						<div className='flex items-center gap-2 flex-wrap'>
							{jiraProjectsQuery.isLoading || jiraProjectsQuery.isFetching ? (
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
						</div>

						{hasJiraProjectsSelected ? (
							<div className='flex items-center gap-2 flex-wrap'>
								{jiraUsersQuery.isLoading || jiraUsersQuery.isFetching ? (
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
								) : null}
							</div>
						) : (
							<FilterDependencyMessage>Select Jira projects to load users</FilterDependencyMessage>
						)}
					</FilterSection>
				</div>

				<div className='flex-1 xl:max-w-[55%]'>
					<FilterSection
						title='GitLab'
						description={
							gitlabProjectsQuery.isLoading || gitlabProjectsQuery.isFetching
								? 'Loading GitLab projects...'
								: gitlabContributorsQuery.isLoading || gitlabContributorsQuery.isFetching
									? 'Loading GitLab contributors for selected projects and date range...'
									: 'Contributors become available after selecting projects and a date range.'
						}
						dependencyHint='Projects + Date range -> Contributors'
					>
						<div className='flex items-center gap-2 flex-wrap'>
							{gitlabProjectsQuery.isLoading || gitlabProjectsQuery.isFetching ? (
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
						</div>

						{hasGitlabProjectsSelected ? (
							hasCompleteDateRange ? (
								<div className='flex items-center gap-2 flex-wrap'>
									{gitlabContributorsQuery.isLoading || gitlabContributorsQuery.isFetching ? (
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
									) : null}
								</div>
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
