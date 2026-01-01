package store

import (
	"context"
	"time"
)

const ProviderAtlassian = "atlassian"

// Token represents stored OAuth tokens.
type Token struct {
	ProfileID    string     `json:"profileId"`
	Provider     string     `json:"provider"`
	AccessToken  string     `json:"accessToken"`
	RefreshToken string     `json:"refreshToken,omitempty"`
	ExpiresAt    *time.Time `json:"expiresAt,omitempty"`
	Scopes       []string   `json:"scopes,omitempty"`
}

type GetTokenInput struct {
	ProfileID string `json:"profileId"`
	Provider  string `json:"provider"`
}

type UpdateTokenInput struct {
	ProfileID    string     `json:"profileId"`
	Provider     string     `json:"provider"`
	AccessToken  string     `json:"accessToken"`
	RefreshToken string     `json:"refreshToken,omitempty"`
	ExpiresAt    *time.Time `json:"expiresAt,omitempty"`
	Scopes       []string   `json:"scopes,omitempty"`
}

// TokenStore manages OAuth tokens.
type TokenStore interface {
	GetToken(ctx context.Context, input *GetTokenInput) (*Token, error)

	// GetRefreshableToken returns a token that has a refresh token associated with it.
	GetRefreshableToken(ctx context.Context, input *GetTokenInput) (*Token, error)

	// UpdateToken replaces token values (access, refresh, expiry, scopes).
	UpdateToken(ctx context.Context, input *UpdateTokenInput) error
}
