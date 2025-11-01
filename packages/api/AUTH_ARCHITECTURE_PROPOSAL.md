# OAuth Authentication Architecture Proposal - Clean Architecture

## Executive Summary

This document proposes a **provider-agnostic OAuth authentication architecture** following clean architecture principles. The design abstracts away provider-specific implementations (Jira/Atlassian, GitLab) and focuses on core authentication domain concepts, enabling easy extension to new providers.

## Core Domain Model

### Domain Entities

#### 1. **Authentication** - OAuth Authentication Session

**Purpose**: Represents a user's authenticated connection to an external service provider.

**Properties:**
- `id: string` - Unique authentication identifier (composite: `profileId` + `provider`)
- `profileId: string` - Reference to UserProfile entity
- `provider: ProviderType` - Provider identifier (enum: `WORKLOG_SERVICE`, `GIT_REPOSITORY`)
- `scopes: string[]` - Granted OAuth scopes
- `grantedAt: string` - ISO 8601 datetime when authentication was granted
- `expiresAt?: string` - ISO 8601 datetime when authentication expires (optional)

**Business Rules:**
- `profileId` must reference an existing UserProfile
- `provider` must be a valid ProviderType
- `scopes` must be non-empty array
- `grantedAt` must be valid ISO 8601 datetime
- `expiresAt` must be after `grantedAt` if provided

**Domain Services:**
- `AuthenticationValidator` - Validates authentication invariants
- `AuthenticationExpiryChecker` - Checks if authentication is expired

#### 2. **OAuthToken** - OAuth Token Credentials

**Purpose**: Encapsulates OAuth access and refresh tokens for an authentication session.

**Properties:**
- `authenticationId: string` - Reference to Authentication entity
- `accessToken: string` - OAuth access token (encrypted in storage)
- `refreshToken?: string` - OAuth refresh token (encrypted in storage, optional)
- `expiresAt?: string` - ISO 8601 datetime when access token expires
- `tokenType: string` - Token type (typically "Bearer")
- `updatedAt: string` - ISO 8601 datetime when token was last updated

**Business Rules:**
- `authenticationId` must reference an existing Authentication
- `accessToken` must be non-empty
- `refreshToken` must be provided if provider supports refresh flow
- `expiresAt` must be valid ISO 8601 datetime if provided
- Tokens must be encrypted before storage (infrastructure concern)

**Domain Services:**
- `TokenValidator` - Validates token structure
- `TokenExpiryChecker` - Checks if token is expired/needs refresh

#### 3. **UserProfile** - User Identity from Provider

**Purpose**: Represents a user's identity/profile information from an OAuth provider.

**Properties:**
- `id: string` - Provider-specific user identifier
- `provider: ProviderType` - Provider identifier
- `accountId: string` - Account identifier (may differ from id, used for cross-system matching)
- `displayName?: string` - Display name
- `email?: string` - Email address
- `username?: string` - Username
- `avatarUrl?: string` - Avatar URL
- `providerMetadata: Record<string, unknown>` - Provider-specific metadata (flexible JSON)
- `createdAt: string` - ISO 8601 datetime when profile was created
- `updatedAt: string` - ISO 8601 datetime when profile was last updated

**Business Rules:**
- `id` must be non-empty
- `provider` must be a valid ProviderType
- At least one identifier (`id`, `accountId`, `email`, or `username`) must be present
- `accountId` is used for cross-system matching (e.g., matching GitLab contributor to Jira author)

**Domain Services:**
- `UserProfileValidator` - Validates profile invariants
- `UserProfileMatcher` - Matches profiles across providers (by accountId, email, etc.)

#### 4. **OAuthAuthorizationRequest** - OAuth Authorization Request

**Purpose**: Represents an in-flight OAuth authorization request (state management).

**Properties:**
- `state: string` - OAuth state parameter (CSRF protection)
- `provider: ProviderType` - Provider identifier
- `redirectUri: string` - Callback URI
- `scopes: string[]` - Requested scopes
- `createdAt: string` - ISO 8601 datetime when request was created
- `expiresAt: string` - ISO 8601 datetime when state expires (typically 10-15 minutes)

**Business Rules:**
- `state` must be cryptographically random and unique
- `state` must expire within reasonable timeframe (e.g., 15 minutes)
- `redirectUri` must be a valid URL
- `scopes` must be non-empty array

**Domain Services:**
- `AuthorizationRequestValidator` - Validates authorization request
- `AuthorizationRequestExpiryChecker` - Checks if state has expired

### Value Objects

#### **ProviderType** - Provider Enum

```typescript
export enum ProviderType {
  WORKLOG_SERVICE = 'WORKLOG_SERVICE',  // Currently Jira/Atlassian
  GIT_REPOSITORY = 'GIT_REPOSITORY'     // Currently GitLab
}
```

**Design Decision**: Use domain-level enum instead of provider names. This allows:
- Provider implementations can change without affecting domain model
- Easy to add new providers (e.g., Linear, GitHub) without changing core domain
- Clear separation: domain uses `WORKLOG_SERVICE`, infrastructure maps to `atlassian`/`jira`

#### **OAuthScope** - OAuth Scope Value Object

```typescript
export class OAuthScope {
  constructor(
    readonly value: string
  ) {
    this.validate()
  }
  
  private validate(): void {
    if (!this.value || this.value.trim().length === 0) {
      throw new ValidationError('OAuth scope cannot be empty')
    }
  }
  
  equals(other: OAuthScope): boolean {
    return this.value === other.value
  }
}
```

## Module Structure

```
packages/api/src/modules/auth/
├── domain/
│   ├── entities/
│   │   ├── authentication.ts
│   │   ├── oauth-token.ts
│   │   └── user-profile.ts
│   ├── value-objects/
│   │   ├── provider-type.ts
│   │   ├── oauth-scope.ts
│   │   └── oauth-authorization-request.ts
│   ├── repositories/
│   │   ├── authentication-repository.ts
│   │   ├── oauth-token-repository.ts
│   │   └── user-profile-repository.ts
│   └── services/
│       ├── token-encryption-service.ts
│       └── oauth-state-service.ts
├── application/
│   ├── commands/
│   │   ├── initiate-oauth-command.ts
│   │   ├── handle-oauth-callback-command.ts
│   │   ├── refresh-token-command.ts
│   │   └── revoke-authentication-command.ts
│   └── use-cases/
│       ├── initiate-oauth-use-case.ts
│       ├── handle-oauth-callback-use-case.ts
│       ├── refresh-token-use-case.ts
│       └── revoke-authentication-use-case.ts
├── infrastructure/
│   ├── adapters/
│   │   ├── oauth-provider-adapter.ts (interface)
│   │   ├── atlassian-oauth-adapter.ts
│   │   └── gitlab-oauth-adapter.ts
│   ├── repositories/
│   │   ├── database-authentication-repository.ts
│   │   ├── database-oauth-token-repository.ts
│   │   └── database-user-profile-repository.ts
│   └── services/
│       ├── aes-token-encryption-service.ts
│       └── crypto-oauth-state-service.ts
└── presentation/
    ├── dtos/
    │   ├── authentication-dto.ts
    │   ├── oauth-authorization-url-dto.ts
    │   └── oauth-callback-result-dto.ts
    └── controllers/
        └── auth-controller.ts (Elysia routes)
```

## Key Design Decisions

### 1. **Provider Abstraction Strategy**

**Domain Layer**: Uses `ProviderType` enum (`WORKLOG_SERVICE`, `GIT_REPOSITORY`)

**Infrastructure Layer**: Maps domain `ProviderType` to concrete implementations:
- `WORKLOG_SERVICE` → `AtlassianOAuthAdapter`
- `GIT_REPOSITORY` → `GitLabOAuthAdapter`

**Benefits**:
- Domain logic doesn't know about Jira/GitLab specifics
- Easy to swap implementations (e.g., Jira → Linear)
- Easy to add new providers without changing domain code

### 2. **Token Storage Strategy**

**Domain Layer**: `OAuthToken` entity (plaintext in memory, encrypted in storage)

**Infrastructure Layer**: 
- `TokenEncryptionService` interface for encryption/decryption
- `AesTokenEncryptionService` implementation
- Repository encrypts before storage, decrypts after retrieval

**Benefits**:
- Tokens never stored in plaintext
- Encryption algorithm can be swapped without affecting domain
- Clear separation: domain owns token structure, infrastructure owns security

### 3. **OAuth Flow Separation**

**Phase 1: Authorization Initiation**
- Use case: `InitiateOAuthUseCase`
- Input: `InitiateOAuthCommand` (provider, scopes, redirectUri)
- Output: Authorization URL + state token
- Domain: Creates `OAuthAuthorizationRequest`, generates state

**Phase 2: Callback Handling**
- Use case: `HandleOAuthCallbackUseCase`
- Input: `HandleOAuthCallbackCommand` (state, code, provider)
- Output: `Authentication` entity + tokens
- Domain: Validates state, exchanges code for tokens, creates authentication

**Phase 3: Token Refresh**
- Use case: `RefreshTokenUseCase`
- Input: `RefreshTokenCommand` (authenticationId)
- Output: New `OAuthToken` with updated access token
- Domain: Validates token expiry, coordinates refresh

**Phase 4: Revocation**
- Use case: `RevokeAuthenticationUseCase`
- Input: `RevokeAuthenticationCommand` (authenticationId)
- Output: Success/failure
- Domain: Marks authentication as revoked, invalidates tokens

### 4. **State Management**

**Domain Service**: `OAuthStateService`
- Generates cryptographically random state tokens
- Validates state tokens (expiry, uniqueness)
- Stores state in memory cache (short-lived, 15 minutes)

**Infrastructure**: 
- `CryptoOAuthStateService` - Uses crypto.randomBytes + Redis/Memory cache
- Alternative: Database-backed state storage for distributed systems

### 5. **Provider Adapter Pattern**

**Interface**: `OAuthProviderAdapter`

```typescript
export interface OAuthProviderAdapter {
  getProviderType(): ProviderType
  
  buildAuthorizationUrl(params: AuthorizationUrlParams): string
  exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokenResponse>
  refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse>
  revokeToken(token: string): Promise<void>
  getUserProfile(accessToken: string): Promise<ProviderUserProfile>
}
```

**Implementations**:
- `AtlassianOAuthAdapter` - Implements Atlassian/Jira OAuth2
- `GitLabOAuthAdapter` - Implements GitLab OAuth2
- Future: `LinearOAuthAdapter`, `GitHubOAuthAdapter`, etc.

**Benefits**:
- Each provider implementation isolated
- Easy to test each provider independently
- Can add new providers without modifying existing code

### 6. **Use Case Orchestration**

**Example: `HandleOAuthCallbackUseCase`**

```typescript
@injectable()
export class HandleOAuthCallbackUseCase {
  constructor(
    @inject(InjectionKey.OAuthStateService)
    private readonly stateService: OAuthStateService,
    
    @inject(InjectionKey.OAuthProviderAdapterFactory)
    private readonly adapterFactory: OAuthProviderAdapterFactory,
    
    @inject(InjectionKey.UserProfileRepository)
    private readonly profileRepository: UserProfileRepository,
    
    @inject(InjectionKey.AuthenticationRepository)
    private readonly authRepository: AuthenticationRepository,
    
    @inject(InjectionKey.OAuthTokenRepository)
    private readonly tokenRepository: OAuthTokenRepository
  ) {}
  
  async execute(command: HandleOAuthCallbackCommand): Promise<Authentication> {
    // 1. Validate state
    const authRequest = await this.stateService.validateAndConsume(command.state)
    
    // 2. Get provider adapter
    const adapter = this.adapterFactory.create(authRequest.provider)
    
    // 3. Exchange code for tokens
    const tokenResponse = await adapter.exchangeCodeForTokens(
      command.code,
      authRequest.redirectUri
    )
    
    // 4. Get user profile from provider
    const providerProfile = await adapter.getUserProfile(tokenResponse.accessToken)
    
    // 5. Upsert user profile
    const userProfile = await this.profileRepository.upsert(
      UserProfile.fromProviderProfile(authRequest.provider, providerProfile)
    )
    
    // 6. Create authentication
    const authentication = new Authentication({
      profileId: userProfile.id,
      provider: authRequest.provider,
      scopes: authRequest.scopes,
      grantedAt: new Date().toISOString(),
      expiresAt: tokenResponse.expiresAt
    })
    
    await this.authRepository.save(authentication)
    
    // 7. Save tokens (encrypted)
    const token = new OAuthToken({
      authenticationId: authentication.id,
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      expiresAt: tokenResponse.expiresAt,
      tokenType: tokenResponse.tokenType
    })
    
    await this.tokenRepository.save(token)
    
    return authentication
  }
}
```

### 7. **Dependency Injection Configuration**

**Injection Keys**:

```typescript
export enum InjectionKey {
  // Repositories
  AuthenticationRepository = 'AuthenticationRepository',
  OAuthTokenRepository = 'OAuthTokenRepository',
  UserProfileRepository = 'UserProfileRepository',
  
  // Services
  TokenEncryptionService = 'TokenEncryptionService',
  OAuthStateService = 'OAuthStateService',
  
  // Adapters
  OAuthProviderAdapterFactory = 'OAuthProviderAdapterFactory',
  
  // Use Cases
  InitiateOAuthUseCase = 'InitiateOAuthUseCase',
  HandleOAuthCallbackUseCase = 'HandleOAuthCallbackUseCase',
  RefreshTokenUseCase = 'RefreshTokenUseCase',
  RevokeAuthenticationUseCase = 'RevokeAuthenticationUseCase'
}
```

**Container Bindings**:

```typescript
// Repositories
container.bind<AuthenticationRepository>(InjectionKey.AuthenticationRepository)
  .to(DatabaseAuthenticationRepository)
  .inSingletonScope()

container.bind<OAuthTokenRepository>(InjectionKey.OAuthTokenRepository)
  .to(DatabaseOAuthTokenRepository)
  .inSingletonScope()

// Services
container.bind<TokenEncryptionService>(InjectionKey.TokenEncryptionService)
  .to(AesTokenEncryptionService)
  .inSingletonScope()

container.bind<OAuthStateService>(InjectionKey.OAuthStateService)
  .to(CryptoOAuthStateService)
  .inSingletonScope()

// Adapter Factory
container.bind<OAuthProviderAdapterFactory>(InjectionKey.OAuthProviderAdapterFactory)
  .toFactory<OAuthProviderAdapter>(context => {
    return (providerType: ProviderType) => {
      switch (providerType) {
        case ProviderType.WORKLOG_SERVICE:
          return context.container.get<AtlassianOAuthAdapter>(InjectionKey.AtlassianOAuthAdapter)
        case ProviderType.GIT_REPOSITORY:
          return context.container.get<GitLabOAuthAdapter>(InjectionKey.GitLabOAuthAdapter)
        default:
          throw new Error(`Unsupported provider type: ${providerType}`)
      }
    }
  })

// Use Cases
container.bind<InitiateOAuthUseCase>(InjectionKey.InitiateOAuthUseCase)
  .to(InitiateOAuthUseCase)

container.bind<HandleOAuthCallbackUseCase>(InjectionKey.HandleOAuthCallbackUseCase)
  .to(HandleOAuthCallbackUseCase)
```

## Security Considerations

### 1. **Token Encryption**
- All tokens encrypted at rest using AES-256-GCM
- Encryption key stored in environment variable (never in code)
- Tokens decrypted only when needed for API calls

### 2. **State Token Security**
- Cryptographically random state tokens (32+ bytes)
- State tokens expire after 15 minutes
- State tokens validated on callback to prevent CSRF

### 3. **Token Refresh Strategy**
- Refresh tokens stored securely (encrypted)
- Automatic token refresh before expiry (configurable threshold)
- Refresh failures trigger re-authentication flow

### 4. **Provider Credentials**
- OAuth client IDs/secrets stored in environment variables
- Never exposed in logs or error messages
- Rotation support (can update credentials without code changes)

## Integration Points

### 1. **Worklog Module Integration**

When fetching worklogs from Jira:
- Use case receives `ProviderType.WORKLOG_SERVICE`
- Retrieves `Authentication` for that provider
- Retrieves `OAuthToken` (decrypted)
- Passes token to `JiraWorklogAdapter` for API calls

### 2. **Commit Module Integration**

When fetching commits from GitLab:
- Use case receives `ProviderType.GIT_REPOSITORY`
- Retrieves `Authentication` for that provider
- Retrieves `OAuthToken` (decrypted)
- Passes token to `GitLabCommitAdapter` for API calls

### 3. **HTTP Request Context**

Elysia middleware can:
- Extract user ID from JWT/session token
- Load user's authentications for all providers
- Inject authenticated tokens into request context
- Handle token refresh automatically

## Benefits of This Architecture

1. **Provider Agnostic**: Domain logic doesn't know about Jira/GitLab specifics
2. **Extensible**: Easy to add new providers (Linear, GitHub, etc.)
3. **Testable**: Each layer can be tested independently with mocks
4. **Secure**: Tokens encrypted, state validated, CSRF protection
5. **Maintainable**: Clear separation of concerns, single responsibility
6. **Flexible**: Can swap implementations without changing domain code

## Migration Path

1. **Phase 1**: Implement domain entities, repositories, use cases (no infrastructure)
2. **Phase 2**: Implement adapter interfaces and adapter factory
3. **Phase 3**: Implement Atlassian adapter (worklog service)
4. **Phase 4**: Implement GitLab adapter (git repository)
5. **Phase 5**: Implement Elysia controllers and routes
6. **Phase 6**: Migrate existing web app to use new API

## Future Enhancements

1. **Multi-User Support**: Currently assumes single user, can extend to multi-user with tenant isolation
2. **Token Rotation**: Automatic token rotation for enhanced security
3. **Webhook Support**: Provider webhooks for token revocation notifications
4. **Audit Logging**: Log all authentication events for security auditing
5. **Rate Limiting**: Protect OAuth endpoints from abuse

