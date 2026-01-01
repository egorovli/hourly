package domain

import (
	"fmt"
	"time"
)

// AccountStatus represents the status returned by Atlassian for an account.
type AccountStatus string

const (
	AccountStatusClosed  AccountStatus = "closed"
	AccountStatusUpdated AccountStatus = "updated"
)

// Account represents a user account to report to Atlassian.
type Account struct {
	AccountID string    `json:"accountId"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// AccountWithStatus represents an account with its privacy status from Atlassian.
type AccountWithStatus struct {
	AccountID string        `json:"accountId"`
	Status    AccountStatus `json:"status"`
}

// ReportAccountsRequest is the request body for the report-accounts API.
type ReportAccountsRequest struct {
	Accounts []Account `json:"accounts"`
}

// ReportAccountsResponse is the response body from the report-accounts API.
type ReportAccountsResponse struct {
	Accounts []AccountWithStatus `json:"accounts"`
}

// ErrRateLimited indicates the API returned 429.
type ErrRateLimited struct {
	RetryAfter time.Duration
}

func (e *ErrRateLimited) Error() string {
	return fmt.Sprintf("rate limited, retry after %s", e.RetryAfter)
}

// ErrAccountNotFound indicates an account was not found.
type ErrAccountNotFound struct {
	AccountID string
}

func (e *ErrAccountNotFound) Error() string {
	return fmt.Sprintf("account not found: %s", e.AccountID)
}

// ErrInvalidRequest indicates a malformed request (400).
type ErrInvalidRequest struct {
	Message string
}

func (e *ErrInvalidRequest) Error() string {
	return fmt.Sprintf("invalid request: %s", e.Message)
}

// ErrForbidden indicates authentication/authorization failure (403).
type ErrForbidden struct {
	Message string
}

func (e *ErrForbidden) Error() string {
	return fmt.Sprintf("forbidden: %s", e.Message)
}

// ErrServiceUnavailable indicates a temporary service issue (503).
type ErrServiceUnavailable struct {
	Message string
}

func (e *ErrServiceUnavailable) Error() string {
	return fmt.Sprintf("service unavailable: %s", e.Message)
}
