package activities

import (
	"context"
	"time"

	"go.temporal.io/sdk/temporal"

	"hourly/workers/reporter/internal/atlassian"
	"hourly/workers/reporter/internal/store"
)

// RefreshableOwnerTokenOutput contains metadata about a refreshable token.
type RefreshableOwnerTokenOutput struct {
	ExpiresAt *time.Time `json:"expiresAt,omitempty"`
}

// DescribeRefreshableOwnerToken returns metadata for the owner's refreshable Atlassian token.
func (a *Activities) DescribeRefreshableOwnerToken(ctx context.Context) (*RefreshableOwnerTokenOutput, error) {
	token, err := a.store.Tokens().GetRefreshableToken(ctx, &store.GetTokenInput{
		ProfileID: a.ownerProfileID,
		Provider:  store.ProviderAtlassian,
	})
	if err != nil {
		return nil, err
	}

	if token == nil || token.RefreshToken == "" {
		return nil, temporal.NewNonRetryableApplicationError(
			"atlassian refresh token not found",
			"MissingRefreshableToken",
			nil,
		)
	}

	return &RefreshableOwnerTokenOutput{
		ExpiresAt: token.ExpiresAt,
	}, nil
}

// RefreshOwnerAccessTokenOutput contains refreshed token metadata.
type RefreshOwnerAccessTokenOutput struct {
	ExpiresAt *time.Time `json:"expiresAt,omitempty"`
}

// RefreshOwnerAccessToken exchanges the owner's refresh token for a new access token and updates storage.
func (a *Activities) RefreshOwnerAccessToken(ctx context.Context) (*RefreshOwnerAccessTokenOutput, error) {
	if a.oauthClientID == "" || a.oauthClientSecret == "" || a.oauthCallbackURL == "" {
		return nil, temporal.NewNonRetryableApplicationError(
			"atlassian oauth client configuration is required",
			"MissingOAuthConfig",
			nil,
		)
	}

	token, err := a.store.Tokens().GetRefreshableToken(ctx, &store.GetTokenInput{
		ProfileID: a.ownerProfileID,
		Provider:  store.ProviderAtlassian,
	})
	if err != nil {
		return nil, err
	}

	if token == nil || token.RefreshToken == "" {
		return nil, temporal.NewNonRetryableApplicationError(
			"atlassian refresh token not found",
			"MissingRefreshableToken",
			nil,
		)
	}

	result, err := atlassian.RefreshAccessToken(ctx, &atlassian.RefreshAccessTokenInput{
		ClientID:     a.oauthClientID,
		ClientSecret: a.oauthClientSecret,
		RefreshToken: token.RefreshToken,
		CallbackURL:  a.oauthCallbackURL,
	})
	if err != nil {
		return nil, err
	}

	refreshToken := result.RefreshToken
	if refreshToken == "" {
		refreshToken = token.RefreshToken
	}

	scopes := result.Scopes
	if len(scopes) == 0 {
		scopes = token.Scopes
	}

	if err := a.store.Tokens().UpdateToken(ctx, &store.UpdateTokenInput{
		ProfileID:    token.ProfileID,
		Provider:     token.Provider,
		AccessToken:  result.AccessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    result.ExpiresAt,
		Scopes:       scopes,
	}); err != nil {
		return nil, err
	}

	return &RefreshOwnerAccessTokenOutput{
		ExpiresAt: result.ExpiresAt,
	}, nil
}
