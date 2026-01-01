package atlassian

import (
	"context"
	"fmt"
)

// TokenProvider fetches a bearer token (e.g., from storage).
type TokenProvider struct {
	get func(ctx context.Context) (string, error)
}

// TokenProviderOptions configures the token provider.
type TokenProviderOptions struct {
	GetToken func(ctx context.Context) (string, error)
}

// NewTokenProvider constructs a token provider from options.
func NewTokenProvider(opts TokenProviderOptions) *TokenProvider {
	return &TokenProvider{get: opts.GetToken}
}

// GetToken returns a bearer token.
func (p *TokenProvider) GetToken(ctx context.Context) (string, error) {
	if p == nil || p.get == nil {
		return "", fmt.Errorf("token provider not configured")
	}
	return p.get(ctx)
}
