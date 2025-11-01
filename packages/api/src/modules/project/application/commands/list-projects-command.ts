/**
 * ListProjectsCommand - Command Object
 *
 * Encapsulates input parameters for the ListProjectsUseCase.
 * Following Command Pattern for use case inputs.
 */
export interface ListProjectsCommand {
	/**
	 * Optional resource ID to filter projects by resource.
	 * If not provided, returns projects from all resources.
	 */
	resourceId?: string
}
