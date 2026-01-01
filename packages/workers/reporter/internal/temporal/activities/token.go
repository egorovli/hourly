package activities

import (
	"context"
	"time"

	"go.temporal.io/sdk/temporal"

	"hourly/workers/reporter/internal/store"
)

// EnsureAccessTokenOutput contains metadata about the current access token (expiresAt only).
type EnsureAccessTokenOutput struct {
	ExpiresAt *time.Time `json:"expiresAt,omitempty"`
}

// EnsureAccessToken verifies the Atlassian access token exists and is not expired.
func (a *Activities) EnsureAccessToken(ctx context.Context) (*EnsureAccessTokenOutput, error) {
	token, err := a.store.Tokens().GetToken(ctx, &store.GetTokenInput{
		ProfileID: a.ownerProfileID,
		Provider:  store.ProviderAtlassian,
	})
	if err != nil {
		return nil, err
	}

	if token == nil || token.AccessToken == "" {
		return nil, temporal.NewNonRetryableApplicationError(
			"atlassian access token not found",
			"MissingAccessToken",
			nil,
		)
	}

	now := time.Now().UTC()
	if token.ExpiresAt != nil && token.ExpiresAt.Before(now) {
		return nil, temporal.NewNonRetryableApplicationError(
			"atlassian access token expired",
			"ExpiredAccessToken",
			nil,
		)
	}

	return &EnsureAccessTokenOutput{
		ExpiresAt: token.ExpiresAt,
	}, nil
}
