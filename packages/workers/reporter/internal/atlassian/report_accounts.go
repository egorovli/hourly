package atlassian

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"hourly/workers/reporter/internal/domain"
)

const (
	reportAccountsPath    = "/app/report-accounts/"
	cyclePeriodHeaderName = "Cycle-Period"
	retryAfterHeaderName  = "Retry-After"
)

// MaxAccountsPerBatch is the maximum accounts per API request (Atlassian limit).
const MaxAccountsPerBatch = 90

// DefaultCyclePeriodDays is the default reporting cycle (7 days per Atlassian spec).
const DefaultCyclePeriodDays = 7

// ReportAccounts reports user accounts to Atlassian's privacy API.
// POST https://api.atlassian.com/app/report-accounts/
//
// Handles:
// - 200: Returns accounts requiring action (closed/updated)
// - 204: Returns NoActionRequired=true
// - 429: Returns *domain.ErrRateLimited with RetryAfter duration
// - 400: Returns *domain.ErrInvalidRequest
// - 403: Returns *domain.ErrForbidden
// - 503: Returns *domain.ErrServiceUnavailable
func (c *Client) ReportAccounts(ctx context.Context, accounts []domain.Account) (*ReportAccountsOutput, error) {
	token, err := c.getToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("resolve token: %w", err)
	}
	if token == "" {
		return nil, fmt.Errorf("missing access token")
	}

	payload := domain.ReportAccountsRequest{
		Accounts: accounts,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	url := c.baseURL + reportAccountsPath
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("execute request: %w", err)
	}
	defer resp.Body.Close()

	cyclePeriod := parseCyclePeriod(resp.Header.Get(cyclePeriodHeaderName))

	switch resp.StatusCode {
	case http.StatusNoContent:
		return &ReportAccountsOutput{
			NoActionRequired: true,
			CyclePeriodDays:  cyclePeriod,
		}, nil

	case http.StatusOK:
		var parsed domain.ReportAccountsResponse
		if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
			return nil, fmt.Errorf("decode response: %w", err)
		}
		return &ReportAccountsOutput{
			Response:        &parsed,
			CyclePeriodDays: cyclePeriod,
		}, nil

	case http.StatusTooManyRequests:
		retryAfter := parseRetryAfter(resp.Header.Get(retryAfterHeaderName))
		return nil, &domain.ErrRateLimited{RetryAfter: retryAfter}

	case http.StatusBadRequest:
		msg := readResponseMessage(resp.Body)
		return nil, &domain.ErrInvalidRequest{Message: msg}

	case http.StatusForbidden:
		msg := readResponseMessage(resp.Body)
		return nil, &domain.ErrForbidden{Message: msg}

	case http.StatusServiceUnavailable:
		msg := readResponseMessage(resp.Body)
		return nil, &domain.ErrServiceUnavailable{Message: msg}

	default:
		msg := readResponseMessage(resp.Body)
		return nil, fmt.Errorf("unexpected status %d: %s", resp.StatusCode, msg)
	}
}

// ReportAccountsOutput contains the API response and metadata.
type ReportAccountsOutput struct {
	// Response contains accounts requiring action (nil if 204 No Content).
	Response *domain.ReportAccountsResponse `json:"response,omitempty"`

	// CyclePeriodDays is the cycle period from Cycle-Period header (0 if not present).
	CyclePeriodDays int `json:"cyclePeriodDays,omitempty"`

	// NoActionRequired is true when API returns 204.
	NoActionRequired bool `json:"noActionRequired"`
}

func parseCyclePeriod(headerValue string) int {
	if headerValue == "" {
		return 0
	}

	value, err := strconv.Atoi(headerValue)
	if err != nil || value < 0 {
		return 0
	}

	return value
}

func parseRetryAfter(headerValue string) time.Duration {
	if headerValue == "" {
		return 0
	}

	// Prefer seconds format
	if secs, err := strconv.Atoi(headerValue); err == nil && secs >= 0 {
		return time.Duration(secs) * time.Second
	}

	// Fallback to HTTP-date
	if t, err := http.ParseTime(headerValue); err == nil {
		return time.Until(t)
	}

	return 0
}

func readResponseMessage(body io.Reader) string {
	const limit = 4 << 10 // 4KB safety limit

	data, err := io.ReadAll(io.LimitReader(body, limit))
	if err != nil || len(data) == 0 {
		return "unknown error"
	}

	return strings.TrimSpace(string(data))
}
