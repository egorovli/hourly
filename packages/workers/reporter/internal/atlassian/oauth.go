package atlassian

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
	authTokenEndpoint   = "https://auth.atlassian.com/oauth/token"
	defaultOAuthTimeout = 15 * time.Second
)

// RefreshAccessTokenInput contains parameters required to refresh an access token.
type RefreshAccessTokenInput struct {
	ClientID     string
	ClientSecret string
	RefreshToken string
	CallbackURL  string
	HTTPClient   *http.Client
}

// RefreshAccessTokenOutput contains refreshed tokens and expiry metadata.
type RefreshAccessTokenOutput struct {
	AccessToken  string
	RefreshToken string
	ExpiresAt    *time.Time
	Scopes       []string
}

type refreshAccessTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	Scope        string `json:"scope"`
}

// RefreshAccessToken exchanges a refresh token for a new access token.
func RefreshAccessToken(ctx context.Context, input *RefreshAccessTokenInput) (*RefreshAccessTokenOutput, error) {
	if input == nil {
		return nil, fmt.Errorf("input is required")
	}

	if input.ClientID == "" || input.ClientSecret == "" {
		return nil, fmt.Errorf("client credentials are required")
	}

	if input.RefreshToken == "" {
		return nil, fmt.Errorf("refresh token is required")
	}

	httpClient := input.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{Timeout: defaultOAuthTimeout}
	}

	payload := map[string]string{
		"grant_type":    "refresh_token",
		"client_id":     input.ClientID,
		"client_secret": input.ClientSecret,
		"refresh_token": input.RefreshToken,
	}

	if input.CallbackURL != "" {
		payload["redirect_uri"] = input.CallbackURL
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, authTokenEndpoint, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("refresh token request: %w", err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(io.LimitReader(resp.Body, 8<<10))
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		message := strings.TrimSpace(string(data))
		return nil, fmt.Errorf("refresh token failed with status %d: %s", resp.StatusCode, message)
	}

	var parsed refreshAccessTokenResponse
	if err := json.Unmarshal(data, &parsed); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	if parsed.AccessToken == "" {
		return nil, fmt.Errorf("refresh token response missing access_token")
	}

	var expiresAt *time.Time
	if parsed.ExpiresIn > 0 {
		expiry := time.Now().UTC().Add(time.Duration(parsed.ExpiresIn) * time.Second)
		expiresAt = &expiry
	}

	return &RefreshAccessTokenOutput{
		AccessToken:  parsed.AccessToken,
		RefreshToken: parsed.RefreshToken,
		ExpiresAt:    expiresAt,
		Scopes:       strings.Fields(parsed.Scope),
	}, nil
}
