package atlassian

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"
)

const (
	defaultBaseURL = "https://api.atlassian.com"
)

// Client is a lightweight Atlassian privacy API client.
type Client struct {
	httpClient    *http.Client
	baseURL       string
	tokenProvider *TokenProvider
}

// Options configures the Atlassian client.
type Options struct {
	// TokenProvider fetches bearer tokens dynamically.
	TokenProvider *TokenProvider
	// BaseURL overrides the default Atlassian API base URL.
	BaseURL string
	// HTTPClient allows injecting a custom client (e.g., with proxies or tracing).
	HTTPClient *http.Client
}

// New creates a new Atlassian client.
func New(opts Options) (*Client, error) {
	baseURL := strings.TrimRight(opts.BaseURL, "/")
	if baseURL == "" {
		baseURL = defaultBaseURL
	}

	if opts.TokenProvider == nil {
		return nil, fmt.Errorf("atlassian token provider is required")
	}

	httpClient := opts.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{
			Timeout: 30 * time.Second,
		}
	}

	return &Client{
		httpClient:    httpClient,
		baseURL:       baseURL,
		tokenProvider: opts.TokenProvider,
	}, nil
}

func (c *Client) getToken(ctx context.Context) (string, error) {
	if c.tokenProvider == nil {
		return "", fmt.Errorf("token provider not configured")
	}
	return c.tokenProvider.GetToken(ctx)
}
