export enum InjectionKey {
	Logger = 'Logger',
	IdGenerator = 'IdGenerator',
	// Projects module
	ProjectRepository = 'ProjectRepository',
	ResourceRepository = 'ResourceRepository',
	ListProjectsUseCase = 'ListProjectsUseCase',
	ListResourcesUseCase = 'ListResourcesUseCase',
	GetProjectByIdUseCase = 'GetProjectByIdUseCase',
	GetResourceByIdUseCase = 'GetResourceByIdUseCase',
	FindProjectUseCase = 'FindProjectUseCase',
	// Worklogs module
	WorklogEntryRepository = 'WorklogEntryRepository',
	ListWorklogEntriesUseCase = 'ListWorklogEntriesUseCase',
	SyncWorklogEntriesUseCase = 'SyncWorklogEntriesUseCase'
}
