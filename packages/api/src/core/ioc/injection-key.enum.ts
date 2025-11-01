export enum InjectionKey {
	Logger = 'Logger',

	// Project module
	ProjectRepository = 'ProjectRepository',
	ListProjectsUseCase = 'ListProjectsUseCase',

	// Auth module
	UserProfileRepository = 'UserProfileRepository',
	AuthenticationRepository = 'AuthenticationRepository',
	OAuthTokenRepository = 'OAuthTokenRepository',
	OAuthStateService = 'OAuthStateService',

	IdGenerator = 'IdGenerator',

	UserProfileValidator = 'UserProfileValidator',
	UserProfileFactory = 'UserProfileFactory',

	RegisterUserProfileUseCase = 'RegisterUserProfileUseCase',
	LinkAuthenticationUseCase = 'LinkAuthenticationUseCase',
	StoreOAuthTokenUseCase = 'StoreOAuthTokenUseCase',
	GenerateOAuthAuthorizationRequestUseCase = 'GenerateOAuthAuthorizationRequestUseCase',
	ValidateOAuthStateUseCase = 'ValidateOAuthStateUseCase',

	AuthController = 'AuthController'
}
